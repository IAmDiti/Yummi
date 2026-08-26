/**
 * Vision AI — fridge photo -> structured ingredient list.
 *
 * Rules the model must follow (see system prompt):
 *  - identify FOOD items only, ignore non-food objects
 *  - never invent an ingredient it cannot see
 *  - mark anything it isn't sure about as "uncertain"
 *  - if it can't find enough, return a warning instead of guessing
 */

import { callClaudeJson } from '../_shared/anthropic.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

type Body = { imageBase64?: string; mediaType?: string };

type VisionResult = {
  ingredients: { name: string; confidence: 'confident' | 'uncertain' }[];
  warning?: string;
};

const SYSTEM = `You are the vision step of a cooking app. The user photographs the inside of their fridge and you list the food they have.

Return ONLY a JSON object, no prose, no code fences:
{
  "ingredients": [{ "name": string, "confidence": "confident" | "uncertain" }],
  "warning": string (optional)
}

Rules:
- List only edible food and drink items and clear cooking staples you can actually see.
- Use short, everyday names ("Cheddar cheese", "Eggs", "Green bell pepper"). One entry per distinct item. No quantities.
- "confident" = clearly identifiable. "uncertain" = partly hidden, ambiguous, or you are guessing from a container.
- NEVER include an item you cannot see. Do not assume common staples are present.
- Ignore non-food objects (shelves, bottles of cleaning product, magnets, hands).
- If the image is too dark / blurry / closed / empty to identify at least 2 confident food items, return {"ingredients": [], "warning": "I couldn't identify enough ingredients. Try taking a photo with the fridge more open and the food visible."}`;

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
  if (!imageBase64) return json({ error: 'No image provided.' }, 400);

  const mediaType = body.mediaType ?? 'image/jpeg';

  try {
    const result = await callClaudeJson<VisionResult>({
      system: SYSTEM,
      maxTokens: 900,
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: 'List the food items you can see in this fridge.' },
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
        warning:
          result.warning ??
          "I couldn't identify enough ingredients. Try taking a photo with the fridge more open and the food visible.",
      } satisfies VisionResult);
    }

    return json({ ingredients, warning: result.warning } satisfies VisionResult);
  } catch (err) {
    console.error('vision error', err);
    return json(
      { error: err instanceof Error ? err.message : 'The assistant is having trouble right now.' },
      502,
    );
  }
});
