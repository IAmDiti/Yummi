/**
 * The one and only app store. Holds the current "session": the ingredient list,
 * the active recommendation, the list of rejected suggestions, and the cooking
 * session once the user starts cooking.
 *
 * Only the ingredient list is persisted (AsyncStorage) so reopening the app
 * doesn't force a re-scan. Everything else is intentionally ephemeral — the MVP
 * has no accounts and no history.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  ChatTurn,
  CookingSession,
  Ingredient,
  Recommendation,
} from '../services/types';

let idc = 0;
export function newIngredientId() {
  idc += 1;
  return `ing-${Date.now()}-${idc}`;
}

type SessionState = {
  ingredients: Ingredient[];
  recommendation: Recommendation | null;
  rejected: string[];
  cooking: CookingSession | null;

  // ingredients
  setIngredients: (list: Ingredient[]) => void;
  addIngredient: (name: string) => void;
  addIngredients: (names: string[]) => void;
  updateIngredient: (id: string, name: string) => void;
  removeIngredient: (id: string) => void;
  clearIngredients: () => void;

  // recommendations
  setRecommendation: (rec: Recommendation | null) => void;
  rejectCurrent: () => void;
  resetRecommendations: () => void;

  // cooking
  startCooking: (rec: Recommendation) => void;
  nextStep: () => void;
  addChatTurn: (turn: ChatTurn) => void;
  applyRevisedSteps: (steps: string[]) => void;
  addSubstitution: (note: string) => void;
  endCooking: () => void;
};

const norm = (s: string) => s.trim().toLowerCase();

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      ingredients: [],
      recommendation: null,
      rejected: [],
      cooking: null,

      setIngredients: (list) => set({ ingredients: dedupe(list) }),

      addIngredient: (name) => {
        const clean = name.trim();
        if (!clean) return;
        if (get().ingredients.some((i) => norm(i.name) === norm(clean))) return;
        set((s) => ({
          ingredients: [...s.ingredients, { id: newIngredientId(), name: clean }],
        }));
      },

      addIngredients: (names) => {
        const existing = new Set(get().ingredients.map((i) => norm(i.name)));
        const toAdd: Ingredient[] = [];
        for (const raw of names) {
          const clean = raw.trim();
          if (!clean || existing.has(norm(clean))) continue;
          existing.add(norm(clean));
          toAdd.push({ id: newIngredientId(), name: clean });
        }
        if (toAdd.length) set((s) => ({ ingredients: [...s.ingredients, ...toAdd] }));
      },

      updateIngredient: (id, name) =>
        set((s) => ({
          ingredients: s.ingredients.map((i) =>
            i.id === id ? { ...i, name: name.trim() || i.name, confidence: undefined } : i,
          ),
        })),

      removeIngredient: (id) =>
        set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) })),

      clearIngredients: () => set({ ingredients: [] }),

      setRecommendation: (rec) => set({ recommendation: rec }),

      rejectCurrent: () =>
        set((s) => {
          if (!s.recommendation) return s;
          const name = s.recommendation.name;
          return {
            rejected: s.rejected.some((r) => norm(r) === norm(name))
              ? s.rejected
              : [...s.rejected, name],
            recommendation: null,
          };
        }),

      resetRecommendations: () => set({ recommendation: null, rejected: [] }),

      startCooking: (rec) =>
        set({
          cooking: {
            recommendation: rec,
            currentStep: 0,
            completedSteps: [],
            substitutions: [],
            history: [],
          },
        }),

      nextStep: () =>
        set((s) => {
          if (!s.cooking) return s;
          const { recommendation, currentStep, completedSteps } = s.cooking;
          const doneText = recommendation.steps[currentStep];
          return {
            cooking: {
              ...s.cooking,
              currentStep: Math.min(currentStep + 1, recommendation.steps.length),
              completedSteps: doneText ? [...completedSteps, doneText] : completedSteps,
            },
          };
        }),

      addChatTurn: (turn) =>
        set((s) =>
          s.cooking
            ? { cooking: { ...s.cooking, history: [...s.cooking.history, turn] } }
            : s,
        ),

      applyRevisedSteps: (steps) =>
        set((s) => {
          if (!s.cooking || steps.length === 0) return s;
          const { recommendation, currentStep } = s.cooking;
          // Replace everything from the current step onward with the revised plan.
          const nextSteps = [...recommendation.steps.slice(0, currentStep), ...steps];
          return {
            cooking: {
              ...s.cooking,
              recommendation: { ...recommendation, steps: nextSteps },
            },
          };
        }),

      addSubstitution: (note) =>
        set((s) =>
          s.cooking
            ? {
                cooking: {
                  ...s.cooking,
                  substitutions: [...s.cooking.substitutions, note],
                },
              }
            : s,
        ),

      endCooking: () => set({ cooking: null }),
    }),
    {
      name: 'yummi-session',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the ingredient list.
      partialize: (s) => ({ ingredients: s.ingredients }),
    },
  ),
);

function dedupe(list: Ingredient[]): Ingredient[] {
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const i of list) {
    const key = norm(i.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

/** Split dictated free text ("I also have rice and leftover beef") into names. */
export function parseSpokenIngredients(text: string): string[] {
  return text
    .replace(/^(i (also )?have|i've got|there's|there is|add|and)\b/gi, '')
    .split(/\s*(?:,|;|\band\b|\bplus\b|\bwith\b)\s*/i)
    .map((s) =>
      s
        .replace(/\b(some|a|an|the|leftover|left over|of|my|little|bit|few)\b/gi, '')
        .replace(/[^\p{L}\p{N}\s'-]/gu, '')
        .trim(),
    )
    .filter((s) => s.length > 1 && s.length < 40);
}
