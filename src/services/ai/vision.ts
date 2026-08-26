/**
 * Vision AI task: fridge photo -> structured ingredient list.
 * See supabase/functions/vision for the actual model call.
 */

import { AiError, type Ingredient } from '../types';
import { IS_MOCK, invokeFunction } from './client';
import { mockVision } from './mock';

let counter = 0;
function makeId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

type VisionResponse = {
  ingredients: { name: string; confidence: 'confident' | 'uncertain' }[];
  warning?: string;
};

export type DetectResult = {
  ingredients: Ingredient[];
  /** set when the photo was unusable — show it to the user and let them retry */
  warning?: string;
};

export async function detectIngredients(imageBase64: string): Promise<DetectResult> {
  const raw: VisionResponse = IS_MOCK
    ? await mockDelay(mockVision)
    : await invokeFunction<VisionResponse>('vision', { imageBase64 });

  const ingredients: Ingredient[] = (raw.ingredients ?? []).map((i) => ({
    id: makeId('ing'),
    name: i.name.trim(),
    confidence: i.confidence,
  }));

  if (ingredients.length === 0) {
    const warning =
      raw.warning ??
      "I couldn't identify enough ingredients. Try taking a photo with the fridge more open and the food visible.";
    return { ingredients: [], warning };
  }

  return { ingredients, warning: raw.warning };
}

function mockDelay<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export { AiError };
