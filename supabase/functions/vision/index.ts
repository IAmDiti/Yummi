/**
 * Vision AI — fridge photo -> structured ingredient list.
 *
 * Rules the model must follow (see system prompt):
 *  - identify FOOD items only, ignore non-food objects
 *  - never invent an ingredient it cannot see
 *  - mark anything it isn't sure about as "uncertain"
 *  - if it can't find enough, return a warning instead of guessing
 */

import { callClaudeStructured, type ObjectSchema } from '../_shared/anthropic.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { localize } from '../_shared/messages.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

type Body = { imageBase64?: string; mediaType?: string; language?: string };

type VisionResult = {
  ingredients: { name: string; confidence: 'confident' | 'uncertain' }[];
  warning?: string;
};

const SYSTEM = `You are the vision step of a cooking app. The user photographs the inside of their fridge and you list the food they have.

Return the result by calling the "respond" tool.

Rules:
- List only edible food and drink items and clear cooking staples you can actually see.
- Use short, everyday names ("Cheddar cheese", "Eggs", "Green bell pepper"). One entry per distinct item. No quantities.
- "confident" = clearly identifiable. "uncertain" = partly hidden, ambiguous, or you are guessing from a container.
- NEVER include an item you cannot see. Do not assume common staples are present.
- Ignore non-food objects (shelves, bottles of cleaning product, magnets, hands).
- If the image is too dark / blurry / closed / empty to identify at least 2 confident food items, return an empty "ingredients" list and set "warning" to a short message (in the requested reply language) explaining that not enough ingredients could be identified and to retake the photo with the fridge more open.
- The user's message will tell you which language to reply in. Write every ingredient "name" and the "warning" (if any) fluently and naturally in that language — the everyday word a native speaker would use for that food, not a stiff or literal translation.`;

const SCHEMA: ObjectSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ingredients'],
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'confidence'],
        properties: {
          name: { type: 'string' },
          confidence: { type: 'string', enum: ['confident', 'uncertain'] },
        },
      },
    },
    warning: { type: 'string' },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const limited = await enforceRateLimit(req);
  if (limited) return limited;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const imageBase64 = (body.imageBase64 ?? '').replace(/^data:image\/\w+;base64,/, '');
  const language = String(body.language ?? '').trim() || 'English';
  if (!imageBase64) return json({ error: localize('noImage', language) }, 400);

  const mediaType = body.mediaType ?? 'image/jpeg';

  try {
    const result = await callClaudeStructured<VisionResult>({
      system: SYSTEM,
      schema: SCHEMA,
      maxTokens: 1200,
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: `List the food items you can see in this fridge. Reply in ${language}.` },
      ],
    });

    const ingredients = Array.isArray(result.ingredients)
      ? result.ingredients
          .filter((i) => i && typeof i.name === 'string' && i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            confidence: i.confidence === 'uncertain' ? 'uncertain' : 'confident',
          }))
      : [];

    const confidentCount = ingredients.filter((i) => i.confidence === 'confident').length;
    if (ingredients.length === 0 || confidentCount < 2) {
      return json({
        ingredients: [],
        warning: result.warning ?? localize('notEnoughIngredients', language),
      } satisfies VisionResult);
    }

    return json({ ingredients, warning: result.warning } satisfies VisionResult);
  } catch (err) {
    console.error('vision error', err);
    return json({ error: err instanceof Error ? err.message : localize('trouble', language) }, 502);
  }
});
