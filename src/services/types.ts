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

/** A photo someone posted of a dish they cooked or ordered, with where they made it. */
export type Post = {
  id: string;
  /** null for bot-seeded posts */
  userId: string | null;
  isSeed: boolean;
  authorName: string;
  authorAvatarUrl: string | null;
  recipeName: string | null;
  difficulty: Difficulty | null;
  photoUrl: string;
  caption: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  ratingCount: number;
  avgRating: number | null;
};

/**
 * Map viewport. Mirrors react-native-maps' `Region` shape, redeclared here so
 * code that only needs the type never has to import the native-only module
 * (which fails to bundle for web).
 */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
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
