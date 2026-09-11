// Turns dietary tag codes into natural-language phrases for the AI prompt.
// Keep the tag list in sync with src/services/dietary.ts and the CHECK
// constraint in supabase/migrations/*_profiles.sql. Edge functions can't
// import from src/, so this mirrors that file rather than sharing it — the
// same duplication already exists for the Difficulty union.

const LABEL: Record<string, string> = {
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  gluten_free: 'gluten-free',
  dairy_free: 'dairy-free',
  nut_allergy: 'nut allergy (no nuts or nut products)',
  shellfish_allergy: 'shellfish allergy (no shellfish)',
  halal: 'halal',
  kosher: 'kosher',
  low_carb: 'low-carb',
  pescatarian: 'pescatarian (fish is fine, no other meat)',
};

export function describeDietaryTags(tags: string[]): string[] {
  return tags.map((t) => LABEL[t] ?? t.replace(/_/g, ' '));
}
