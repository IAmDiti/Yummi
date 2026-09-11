/**
 * Canned AI responses used when no backend is configured
 * (EXPO_PUBLIC_SUPABASE_URL is unset). Lets the entire UI flow be exercised in
 * Expo Go / web before the Supabase functions are deployed.
 */

import type { Recommendation } from '../types';

export const mockVision = {
  ingredients: [
    { name: 'Chicken breast', confidence: 'confident' as const },
    { name: 'Eggs', confidence: 'confident' as const },
    { name: 'Cheddar cheese', confidence: 'confident' as const },
    { name: 'Tomatoes', confidence: 'confident' as const },
    { name: 'Onion', confidence: 'confident' as const },
    { name: 'Tortillas', confidence: 'uncertain' as const },
    { name: 'Hot sauce', confidence: 'uncertain' as const },
  ],
  warning: undefined as string | undefined,
};

const POOL: Omit<Recommendation, 'id'>[] = [
  {
    name: 'Spicy Chicken Quesadilla',
    description:
      'Crispy tortilla folded over melted cheese and pan-seared chicken with a kick of hot sauce.',
    difficulty: 'easy',
    prepTime: 5,
    cookTime: 7,
    requiredIngredients: ['Chicken breast', 'Tortillas', 'Cheddar cheese', 'Hot sauce'],
    missingIngredients: [],
    pans: 1,
    reason:
      'You have everything you need, it is quick, and the hot sauce gives it the spicy flavour you seem to have on hand.',
    steps: [
      'Take out the chicken, tortillas, cheese and hot sauce.',
      'Cut the chicken into small bite-size pieces.',
      'Heat a pan over medium-high heat with a little oil.',
      'Cook the chicken 5–6 minutes until no longer pink, then stir in a spoon of hot sauce.',
      'Lay a tortilla in the pan, cover half with cheese and chicken, fold over.',
      'Cook 1–2 minutes per side until golden and the cheese melts.',
      'Slice into wedges and serve.',
    ],
  },
  {
    name: 'Cheese Omelette with Spicy Tomato',
    description:
      'Soft folded omelette with a quick garlicky tomato-and-hot-sauce relish spooned over.',
    difficulty: 'easy',
    prepTime: 5,
    cookTime: 8,
    requiredIngredients: ['Eggs', 'Cheddar cheese', 'Tomatoes', 'Onion', 'Hot sauce'],
    missingIngredients: [],
    pans: 1,
    reason:
      'A different direction from chicken: fast, uses your eggs and tomatoes, and still delivers the spicy note.',
    steps: [
      'Finely chop half an onion and one tomato.',
      'Soften the onion in a pan with oil for 3 minutes, add tomato and a dash of hot sauce, set aside.',
      'Beat 3 eggs with a pinch of salt.',
      'Wipe the pan, add a little butter or oil over medium heat, pour in the eggs.',
      'When almost set, scatter cheese over one half and fold.',
      'Slide onto a plate and spoon the spicy tomato over the top.',
    ],
  },
  {
    name: 'One-Pan Chicken & Rice',
    description:
      'Comforting skillet of seasoned chicken and rice with onion and tomato, everything in one pot.',
    difficulty: 'medium',
    prepTime: 10,
    cookTime: 25,
    requiredIngredients: ['Chicken breast', 'Onion', 'Tomatoes'],
    missingIngredients: ['Rice', 'Stock or broth'],
    pans: 1,
    reason:
      'A heartier option if you want leftovers; needs rice which you may have to add, but otherwise uses what you have.',
    steps: [
      'Dice the chicken, onion and tomato.',
      'Brown the chicken in a deep pan, remove and set aside.',
      'Soften the onion, add tomato and cook 2 minutes.',
      'Stir in the rice to coat, add double its volume in water or stock.',
      'Return the chicken, cover, simmer 18–20 minutes until the rice is tender.',
      'Rest 5 minutes off the heat, fluff and serve.',
    ],
  },
  {
    name: 'Fried Egg & Cheese Tortilla Melt',
    description:
      'Open tortilla topped with melty cheese and a crispy-edged fried egg, folded and toasted.',
    difficulty: 'easy',
    prepTime: 3,
    cookTime: 6,
    requiredIngredients: ['Eggs', 'Tortillas', 'Cheddar cheese', 'Hot sauce'],
    missingIngredients: [],
    pans: 1,
    reason:
      'The lowest-effort option left: three ingredients, one pan, done in under ten minutes.',
    steps: [
      'Heat a pan over medium heat.',
      'Lay a tortilla in the pan and cover with cheese.',
      'Crack an egg onto one side of the tortilla, cover the pan for 2 minutes.',
      'Once the white is set, fold the tortilla over the egg.',
      'Press and toast 1 minute per side, add hot sauce, serve.',
    ],
  },
  {
    name: 'Stuffed Chicken with Tomato Reduction',
    description:
      'Pan-seared chicken breast stuffed with cheese and onion, finished with a hand-reduced tomato sauce.',
    difficulty: 'hard',
    prepTime: 20,
    cookTime: 30,
    requiredIngredients: ['Chicken breast', 'Cheddar cheese', 'Onion', 'Tomatoes'],
    missingIngredients: ['Kitchen twine or toothpicks'],
    pans: 2,
    reason:
      'For when you want to slow down and actually cook something — more knife work and timing, but a restaurant-style result from what you already have.',
    steps: [
      'Finely chop the onion and set half aside for the sauce.',
      'Butterfly the chicken breast and stuff with cheese and half the onion; secure with toothpicks.',
      'Sear the chicken in an oiled pan 4–5 minutes per side until golden, then set aside covered.',
      'In the same pan, soften the remaining onion, add chopped tomatoes and simmer 10 minutes, mashing as it reduces.',
      'Slice the chicken to check the centre is cooked through; return briefly to the pan if not.',
      'Spoon the reduction over the sliced chicken and serve.',
    ],
  },
  {
    name: 'Slow-Braised Chicken Ragu',
    description:
      'Deeply savoury shredded chicken simmered low and slow in a rich tomato-onion base, built in stages.',
    difficulty: 'extra_hard',
    prepTime: 20,
    cookTime: 90,
    requiredIngredients: ['Chicken breast', 'Onion', 'Tomatoes', 'Cheddar cheese'],
    missingIngredients: ['Tomato paste', 'Red wine or extra stock'],
    pans: 2,
    reason:
      'The full-effort option: a long, hands-off braise that rewards patience with a sauce you build in layers.',
    steps: [
      'Dice the onion finely and sear the chicken whole in a heavy pot until deeply browned on all sides.',
      'Remove the chicken, soften the onion in the same pot, then stir in tomato paste and cook 2 minutes.',
      'Add the tomatoes and a splash of wine or stock, scraping up the browned bits.',
      'Return the chicken, cover, and simmer on low 60–75 minutes, checking and stirring occasionally.',
      'Shred the chicken directly in the pot once fork-tender, discarding any bones.',
      'Simmer uncovered 10 more minutes to thicken, taste and adjust seasoning.',
      'Finish with grated cheese over the top and serve.',
    ],
  },
];

let mockBatchCount = 0;

/** Returns every pool item that isn't rejected (and matches difficulty, if given) as one batch. */
export function mockRecommendationBatch(
  rejected: string[],
  difficulty?: Recommendation['difficulty'],
): Recommendation[] {
  mockBatchCount += 1;
  const notRejected = POOL.filter(
    (r) => !rejected.some((x) => x.toLowerCase() === r.name.toLowerCase()),
  );
  const scoped = difficulty ? notRejected.filter((r) => r.difficulty === difficulty) : notRejected;
  const pool = scoped.length > 0 ? scoped : notRejected.length > 0 ? notRejected : POOL;

  return pool.map((r, i) => ({ ...r, id: `mock-${Date.now()}-${mockBatchCount}-${i}` }));
}

export function mockCookingAnswer(userMessage: string): {
  answer: string;
  revisedSteps?: string[];
} {
  const m = userMessage.toLowerCase();
  if (m.includes('olive oil') || m.includes('no oil')) {
    return {
      answer:
        "That's okay. Use a small amount of any other cooking oil, or butter. If your pan is non-stick you can use very little.",
    };
  }
  if (m.includes('pink') || m.includes('raw') || m.includes('not cooked')) {
    return {
      answer:
        'Cook it another 2–3 minutes and check the thickest piece is white all the way through before moving on.',
    };
  }
  if (m.includes('tortilla')) {
    return {
      answer:
        "No problem — serve it as a bowl instead. Skip the folding step and just plate the filling over rice, bread, or on its own.",
      revisedSteps: [
        'Skip the tortilla. Plate the cooked filling straight from the pan.',
        'Top with cheese while hot so it melts, add hot sauce, and serve.',
      ],
    };
  }
  return {
    answer:
      "You're doing fine. Keep going with the current step and tap Done when you're ready.",
  };
}
