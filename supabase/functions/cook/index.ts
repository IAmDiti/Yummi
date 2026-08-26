/**
 * Cooking AI — answers questions and handles substitutions during an active
 * cooking session. One useful instruction or answer at a time.
 *
 * Advancing steps is done client-side ("Done"); this function is only called
 * when the user asks something or reports a problem.
 */

import { callClaudeJson } from '../_shared/anthropic.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/ratelimit.ts';

type Body = {
  recipe?: { name?: string; steps?: string[] };
  ingredients?: string[];
  currentStepIndex?: number;
  currentStepText?: string;
  remainingSteps?: string[];
  completedSteps?: string[];
  substitutions?: string[];
  history?: { role: 'user' | 'assistant'; content: string }[];
  userMessage?: string;
};

type CookReply = { answer: string; revisedSteps?: string[] };

const SYSTEM = `You are a calm, practical cooking assistant guiding one person through a recipe step by step, hands-free. Keep answers SHORT (1-3 sentences), spoken-friendly, and specific. No lists unless asked. Never dump the whole recipe.

You are given the recipe, the current step, the steps already done, known substitutions, and the user's message. Answer their question or solve their problem in the context of where they are right now.

If something they say changes the plan for the REMAINING steps (a missing ingredient, a swap, a mistake to recover from), provide "revisedSteps": a fresh list of the remaining steps from the current point onward. Otherwise omit "revisedSteps".

Return ONLY a JSON object, no prose, no code fences:
{ "answer": string, "revisedSteps": string[] (optional) }`;

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

  const userMessage = String(body.userMessage ?? '').trim();
  if (!userMessage) return json({ error: 'No question provided.' }, 400);

  const recipe = body.recipe ?? {};
  const context = [
    `Recipe: ${recipe.name ?? 'unknown'}`,
    `Ingredients: ${(body.ingredients ?? []).join(', ') || 'not specified'}`,
    `Full step list: ${(recipe.steps ?? []).map((s, i) => `${i + 1}. ${s}`).join(' ')}`,
    `Current step (#${(body.currentStepIndex ?? 0) + 1}): ${body.currentStepText ?? '(none)'}`,
    body.completedSteps?.length ? `Already done: ${body.completedSteps.join(' | ')}` : '',
    body.substitutions?.length ? `Substitutions so far: ${body.substitutions.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const recentHistory = (body.history ?? [])
    .slice(-6)
    .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
    .join('\n');

  const content = [
    context,
    recentHistory ? `\nRecent conversation:\n${recentHistory}` : '',
    `\nUser now says: "${userMessage}"`,
  ].join('\n');

  try {
    const reply = await callClaudeJson<CookReply>({
      system: SYSTEM,
      maxTokens: 700,
      content,
    });

    const answer = String(reply.answer ?? '').trim() || "Keep going — you're on track.";
    const revisedSteps = Array.isArray(reply.revisedSteps)
      ? reply.revisedSteps.map((s) => String(s).trim()).filter(Boolean)
      : undefined;

    return json({ answer, ...(revisedSteps && revisedSteps.length ? { revisedSteps } : {}) });
  } catch (err) {
    console.error('cook error', err);
    return json(
      { error: err instanceof Error ? err.message : 'The assistant is having trouble right now.' },
      502,
    );
  }
});
