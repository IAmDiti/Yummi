/**
 * Recommendation AI task: confirmed ingredients (+ rejected suggestions) -> a
 * batch of diverse meals for the swipe deck.
 *
 * One call returns several options (optionally scoped to one difficulty
 * tier). Swiping a card away adds its name to the growing `rejected` list so
 * the next batch steers away from it.
 */

import { LANGUAGE_ENGLISH_NAME, useLocale } from '../../store/locale';
import type { Difficulty, Ingredient, Recommendation } from '../types';
import { IS_MOCK, invokeFunction } from './client';
import { mockRecommendationBatch } from './mock';

let counter = 0;
function makeId() {
  counter += 1;
  return `rec-${Date.now()}-${counter}`;
}

type RawRecommendation = Omit<Recommendation, 'id'>;
type RawBatch = { recommendations: RawRecommendation[] };

export async function getRecommendationBatch(
  ingredients: Ingredient[],
  rejected: string[],
  /** the signed-in user's dietary tags, if any — treated as hard constraints server-side */
  dietaryTags: string[] = [],
  difficulty?: Difficulty,
): Promise<Recommendation[]> {
  const names = ingredients.map((i) => i.name).filter(Boolean);

  if (IS_MOCK) {
    return mockDelay(mockRecommendationBatch(rejected, difficulty), 1100);
  }

  const raw = await invokeFunction<RawBatch>('recommend', {
    ingredients: names,
    rejected,
    dietaryTags,
    difficulty,
    language: LANGUAGE_ENGLISH_NAME[useLocale.getState().language],
  });

  return (raw.recommendations ?? []).map(normalise);
}

function normalise(raw: RawRecommendation): Recommendation {
  return {
    id: makeId(),
    name: raw.name ?? 'A simple meal',
    description: raw.description ?? '',
    difficulty: raw.difficulty ?? 'easy',
    prepTime: Number(raw.prepTime) || 0,
    cookTime: Number(raw.cookTime) || 0,
    requiredIngredients: raw.requiredIngredients ?? [],
    missingIngredients: raw.missingIngredients ?? [],
    pans: raw.pans === null || raw.pans === undefined ? null : Number(raw.pans),
    reason: raw.reason ?? '',
    steps: (raw.steps ?? []).map((s) => String(s).trim()).filter(Boolean),
  };
}

function mockDelay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
