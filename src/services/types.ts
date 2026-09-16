/**
 * Shared data models for the whole app. Kept flat and simple per the MVP spec —
 * no database schema, these are just the shapes that move between screens and
 * the AI service layer.
 */

export type Confidence = 'confident' | 'uncertain';

export type Ingredient = {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  confidence?: Confidence;
};

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extra_hard';

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_allergy'
  | 'shellfish_allergy'
  | 'halal'
  | 'kosher'
  | 'low_carb'
  | 'pescatarian';

export type Profile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  dietaryTags: DietaryTag[];
  /** When true, posts and ratings show "***" instead of displayName. */
  hideUsername: boolean;
};

export type Recommendation = {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  /** minutes */
  prepTime: number;
  /** minutes */
  cookTime: number;
  requiredIngredients: string[];
  missingIngredients: string[];
  /** number of pans / dishes, or null if unknown */
  pans: number | null;
  /** "why I picked this" */
  reason: string;
  /** initial step-by-step cooking plan, short imperative sentences */
  steps: string[];
};

/** A photo someone posted of a dish they cooked or ordered. */
export type Post = {
  id: string;
  /** null for bot-seeded posts */
  userId: string | null;
  isSeed: boolean;
  /** "***" when the poster chose to hide their username (see Profile.hideUsername) */
  authorName: string;
  authorAvatarUrl: string | null;
  recipeName: string | null;
  difficulty: Difficulty | null;
  photoUrl: string;
  caption: string | null;
  createdAt: string;
  ratingCount: number;
  avgRating: number | null;
};

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type CookingSession = {
  recommendation: Recommendation;
  /** index into recommendation.steps */
  currentStep: number;
  completedSteps: string[];
  /** free-text notes like "no olive oil – used butter" */
  substitutions: string[];
  history: ChatTurn[];
};

/** Normalised error surface returned by the AI service layer. */
export type AiErrorCode =
  | 'network'
  | 'timeout'
  | 'ai'
  | 'no_ingredients'
  | 'unknown';

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AiError';
  }
}
