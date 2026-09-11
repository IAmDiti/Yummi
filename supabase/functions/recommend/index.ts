/**
 * Recommendation AI — ingredients (+ rejected suggestions) -> a batch of
 * diverse meals for the swipe deck.
 *
 * One model call returns 5-6 options spanning different difficulty tiers (or
 * all matching a single requested tier), rather than round-tripping once per
 * card. The `rejected` list grows every time a card is swiped away; the model
 * must avoid those and keep the batch feeling fresh.
 */

import { callClaudeStructured, type ObjectSchema } from '../_shared/anthropic.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { describeDietaryTags } from '../_shared/dietary.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

type Difficulty = 'easy' | 'medium' | 'hard' | 'extra_hard';

type Body = {
  ingredients?: string[];
  rejected?: string[];
  dietaryTags?: string[];
  difficulty?: string;
};

type Recommendation = {
  name: string;
  description: string;
  difficulty: Difficulty;
  prepTime: number;
  cookTime: number;
  requiredIngredients: string[];
  missingIngredients: string[];
  pans: number | null;
  reason: string;
  steps: string[];
};

type RawBatch = { recommendations?: unknown[] };

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'extra_hard'];

const SYSTEM = `You are a personal food assistant inside a mobile app. The user is hungry and wants a handful of good meal options to swipe through — not an exhaustive recipe database, and not needless duplicates of the same idea.

Return the result by calling the "respond" tool. Field notes:
- description: one appetising sentence.
- prepTime / cookTime: whole minutes.
- requiredIngredients: everything the meal needs. missingIngredients: the subset of those the user did NOT list.
- pans: pans/pots/dishes used, or null if unclear.
- reason: "why I picked this" — friendly, 1-2 sentences, referencing their ingredients.
- steps: 4-10 short imperative cooking steps.

Return 5-6 meals, each genuinely different from the others (different protein, format, or cuisine — not the same dish with one ingredient swapped). Unless a single difficulty tier is requested, spread the batch across easy/medium/hard/extra_hard rather than clustering on one tier. Consider: ingredients on hand, cooking time, number of pans, flavour profile, and whether it is practical. Prefer meals that need few or no missing ingredients. It is fine to assume basic staples (salt, pepper, oil, water, butter) unless they were explicitly rejected.

If a "rejected" list is provided, you MUST NOT include any of those dishes or a near-identical variant anywhere in the batch.

If dietary restrictions are given, they are HARD CONSTRAINTS, not preferences — every recommendation must fully comply, no exceptions, even if that means ignoring some of the user's ingredients. If nothing fully compliant can be made from the given ingredients, still return compliant meals using reasonable additional pantry staples rather than violating a restriction.

If a specific difficulty tier is requested, EVERY recommendation in the batch must be exactly that tier.`;

const SCHEMA: ObjectSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'description',
          'difficulty',
          'prepTime',
          'cookTime',
          'requiredIngredients',
          'missingIngredients',
          'pans',
          'reason',
          'steps',
        ],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          difficulty: { type: 'string', enum: DIFFICULTIES },
          prepTime: { type: 'integer' },
          cookTime: { type: 'integer' },
          requiredIngredients: { type: 'array', items: { type: 'string' } },
          missingIngredients: { type: 'array', items: { type: 'string' } },
          pans: { type: ['integer', 'null'] },
          reason: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
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

  const ingredients = (body.ingredients ?? []).map((s) => String(s).trim()).filter(Boolean);
  const rejected = (body.rejected ?? []).map((s) => String(s).trim()).filter(Boolean);
  const dietaryTags = (body.dietaryTags ?? []).map((s) => String(s).trim()).filter(Boolean);
  const difficulty = DIFFICULTIES.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : undefined;

  if (ingredients.length === 0) {
    return json({ error: 'Add at least one ingredient first.' }, 400);
  }

  const userMsg = [
    `Ingredients I have: ${ingredients.join(', ')}.`,
    rejected.length
      ? `Do NOT suggest these — I already rejected them: ${rejected.join(', ')}. Suggest options clearly different from all of these.`
      : '',
    dietaryTags.length
      ? `Dietary restrictions (HARD CONSTRAINTS, must comply): ${describeDietaryTags(dietaryTags).join(', ')}.`
      : '',
    difficulty ? `Only include meals at this difficulty tier: ${difficulty}.` : '',
    'Recommend 5-6 diverse meal options.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const raw = await callClaudeStructured<RawBatch>({
      system: SYSTEM,
      schema: SCHEMA,
      maxTokens: 8000,
      content: userMsg,
    });

    let list = (Array.isArray(raw.recommendations) ? raw.recommendations : [])
      .map(cleanRecommendation)
      .filter((r) => r.steps.length > 0);

    if (difficulty) {
      const matching = list.filter((r) => r.difficulty === difficulty);
      if (matching.length > 0) list = matching;
    }

    if (list.length === 0) {
      return json({ error: 'The assistant could not plan any meals. Try again.' }, 502);
    }

    return json({ recommendations: list });
  } catch (err) {
    console.error('recommend error', err);
    return json(
      { error: err instanceof Error ? err.message : 'The assistant is having trouble right now.' },
      502,
    );
  }
});

// Light validation / defaults so the client always gets a usable shape.
function cleanRecommendation(rec: unknown): Recommendation {
  const r = (rec ?? {}) as Record<string, unknown>;
  return {
    name: String(r.name ?? 'A simple meal').trim(),
    description: String(r.description ?? '').trim(),
    difficulty: DIFFICULTIES.includes(r.difficulty as Difficulty) ? (r.difficulty as Difficulty) : 'easy',
    prepTime: Math.max(0, Math.round(Number(r.prepTime) || 0)),
    cookTime: Math.max(0, Math.round(Number(r.cookTime) || 0)),
    requiredIngredients: asStringArray(r.requiredIngredients),
    missingIngredients: asStringArray(r.missingIngredients),
    pans:
      r.pans === null || r.pans === undefined || Number.isNaN(Number(r.pans))
        ? null
        : Math.max(1, Math.round(Number(r.pans))),
    reason: String(r.reason ?? '').trim(),
    steps: asStringArray(r.steps),
  };
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}
