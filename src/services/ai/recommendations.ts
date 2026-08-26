/**
 * Recommendation AI task: confirmed ingredients (+ rejected suggestions) -> ONE
 * meal the user is most likely to actually want to eat.
 *
 * This is a decision-reduction engine, not a recipe search. It returns a single
 * Recommendation. "Not what I want" calls it again with a growing `rejected`
 * list so the model steers away from what was turned down.
 */

import type { Ingredient, Recommendation } from '../types';
import { IS_MOCK, invokeFunction } from './client';
import { mockRecommendation } from './mock';

let counter = 0;
function makeId() {
  counter += 1;
  return `rec-${Date.now()}-${counter}`;
}

type RawRecommendation = Omit<Recommendation, 'id'>;

export async function getRecommendation(
  ingredients: Ingredient[],
  rejected: string[],
): Promise<Recommendation> {
  const names = ingredients.map((i) => i.name).filter(Boolean);

  if (IS_MOCK) {
    return mockDelay(mockRecommendation(rejected), 1100);
  }

  const raw = await invokeFunction<RawRecommendation>('recommend', {
    ingredients: names,
    rejected,
  });

  return normalise(raw);
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
