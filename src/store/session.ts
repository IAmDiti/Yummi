/**
 * The scan -> ingredients -> recommend -> cook flow store. Holds the current
 * ingredient list, the active recommendation, the list of rejected suggestions,
 * and the cooking session once the user starts cooking. Independent of who's
 * signed in — see src/store/auth.ts for the account/profile store — so this
 * flow keeps working fully signed out.
 *
 * Only the ingredient list is persisted (AsyncStorage) so reopening the app
 * doesn't force a re-scan. Everything else is intentionally ephemeral.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  ChatTurn,
  CookingSession,
  Difficulty,
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
  /** the swipe deck — queue[0] is the top card */
  recommendationQueue: Recommendation[];
  difficultyFilter: Difficulty | null;
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
  /** replaces the whole deck (first load, or the difficulty filter changed) */
  setQueue: (list: Recommendation[]) => void;
  /** tops up the deck with a prefetched batch, skipping names already seen */
  appendToQueue: (list: Recommendation[]) => void;
  setDifficultyFilter: (d: Difficulty | null) => void;
  /** swipe left: drop the top card and remember it as rejected */
  swipeReject: () => void;
  /** swipe right: drop the top card and return it so the caller can start cooking it */
  swipeAccept: () => Recommendation | null;
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
      recommendationQueue: [],
      difficultyFilter: null,
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

      setQueue: (list) => set({ recommendationQueue: list }),

      appendToQueue: (list) =>
        set((s) => {
          const seen = new Set([
            ...s.recommendationQueue.map((r) => norm(r.name)),
            ...s.rejected.map(norm),
          ]);
          const fresh = list.filter((r) => !seen.has(norm(r.name)));
          return fresh.length ? { recommendationQueue: [...s.recommendationQueue, ...fresh] } : s;
        }),

      setDifficultyFilter: (d) => set({ difficultyFilter: d }),

      swipeReject: () =>
        set((s) => {
          const [top, ...rest] = s.recommendationQueue;
          if (!top) return s;
          return {
            recommendationQueue: rest,
            rejected: s.rejected.some((r) => norm(r) === norm(top.name))
              ? s.rejected
              : [...s.rejected, top.name],
          };
        }),

      swipeAccept: () => {
        const [top, ...rest] = get().recommendationQueue;
        if (!top) return null;
        set({ recommendationQueue: rest });
        return top;
      },

      resetRecommendations: () =>
        set({ recommendationQueue: [], rejected: [], difficultyFilter: null }),

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
