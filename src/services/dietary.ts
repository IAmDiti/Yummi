/**
 * The fixed list of dietary tags a profile can carry. Shared by the profile
 * screen (src/app/profile.tsx) and the recommend AI task, which sends these
 * to the edge function as hard constraints. Keep in sync with the CHECK
 * constraint in supabase/migrations/*_profiles.sql and the label map in
 * supabase/functions/_shared/dietary.ts (edge functions can't import from src/).
 */

import type { DietaryTag } from './types';

export const DIETARY_TAGS: DietaryTag[] = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'nut_allergy',
  'shellfish_allergy',
  'halal',
  'kosher',
  'low_carb',
  'pescatarian',
];

export const DIETARY_TAG_LABEL: Record<DietaryTag, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten-free',
  dairy_free: 'Dairy-free',
  nut_allergy: 'Nut allergy',
  shellfish_allergy: 'Shellfish allergy',
  halal: 'Halal',
  kosher: 'Kosher',
  low_carb: 'Low-carb',
  pescatarian: 'Pescatarian',
};
