/**
 * Recommendation AI — ingredients (+ rejected suggestions) -> ONE meal.
 *
 * This is a decision-reduction engine. It returns exactly one recommendation.
 * The `rejected` list grows every time the user taps "Not what I want"; the
 * model must move away from those and gradually narrow toward something the
 * user actually wants.
 */

import { callClaudeJson } from '../_shared/anthropic.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

type Body = { ingredients?: string[]; rejected?: string[] };

type Recommendation = {
  name: string;
  description: string;
  difficulty: 'easy' | 'moderate' | 'more effort';
  prepTime: number;
  cookTime: number;
  requiredIngredients: string[];
  missingIngredients: string[];
  pans: number | null;
  reason: string;
  steps: string[];
};

const SYSTEM = `You are a personal food assistant inside a mobile app. The user is hungry and does not want to think. Your job is DECISION REDUCTION: recommend the ONE meal they are most likely to actually want to eat right now — not every possible recipe.

Return ONLY a JSON object, no prose, no code fences:
{
  "name": string,
  "description": string,            // one appetising sentence
  "difficulty": "easy" | "moderate" | "more effort",
  "prepTime": number,               // minutes, integer
  "cookTime": number,               // minutes, integer
  "requiredIngredients": string[],  // what this meal needs
  "missingIngredients": string[],   // subset of required that the user did NOT list
  "pans": number | null,            // pans/pots/dishes used, null if unclear
  "reason": string,                 // "why I picked this" — friendly, 1-2 sentences, reference their ingredients
  "steps": string[]                 // 4-10 short imperative cooking steps
}

Consider: ingredients on hand, cooking time, difficulty, number of pans, flavour profile, and whether it is practical. Prefer meals that need few or no missing ingredients. It is fine to assume basic staples (salt, pepper, oil, water, butter) unless they were explicitly rejected.

If a "rejected" list is provided, you MUST NOT recommend any of those dishes or a near-identical variant. Treat each rejection as a signal: change something meaningful (different protein, different format, different cuisine, lighter/heavier, faster/slower). With more rejections, narrow further toward a simple crowd-pleaser.`;

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

  if (ingredients.length === 0) {
    return json({ error: 'Add at least one ingredient first.' }, 400);
  }

  const userMsg = [
    `Ingredients I have: ${ingredients.join(', ')}.`,
    rejected.length
      ? `Do NOT suggest these — I already rejected them: ${rejected.join(', ')}. Suggest something clearly different.`
      : '',
    'Recommend one meal.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const rec = await callClaudeJson<Recommendation>({
      system: SYSTEM,
      maxTokens: 1400,
      content: userMsg,
    });

    // Light validation / defaults so the client always gets a usable shape.
    const clean: Recommendation = {
      name: String(rec.name ?? 'A simple meal').trim(),
      description: String(rec.description ?? '').trim(),
      difficulty:
        rec.difficulty === 'moderate' || rec.difficulty === 'more effort'
          ? rec.difficulty
          : 'easy',
      prepTime: Math.max(0, Math.round(Number(rec.prepTime) || 0)),
      cookTime: Math.max(0, Math.round(Number(rec.cookTime) || 0)),
      requiredIngredients: asStringArray(rec.requiredIngredients),
      missingIngredients: asStringArray(rec.missingIngredients),
      pans:
        rec.pans === null || rec.pans === undefined || Number.isNaN(Number(rec.pans))
          ? null
          : Math.max(1, Math.round(Number(rec.pans))),
      reason: String(rec.reason ?? '').trim(),
      steps: asStringArray(rec.steps),
    };

    if (clean.steps.length === 0) {
      return json({ error: 'The assistant could not plan that meal. Try again.' }, 502);
    }

    return json(clean);
  } catch (err) {
    console.error('recommend error', err);
    return json(
      { error: err instanceof Error ? err.message : 'The assistant is having trouble right now.' },
      502,
    );
  }
});

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}
