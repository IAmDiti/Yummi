/**
 * Cooking AI task: answer questions / handle substitutions during an active
 * cooking session. One useful instruction or answer at a time.
 *
 * Advancing steps ("Done") is handled locally in the store — no AI call — so it
 * stays instant and works with busy hands. The AI is only involved when the user
 * asks something or reports a problem.
 */

import type { CookingSession } from '../types';
import { IS_MOCK, invokeFunction } from './client';
import { mockCookingAnswer } from './mock';

export type CookingReply = {
  answer: string;
  /** if the plan changed (a substitution), the new list of REMAINING steps */
  revisedSteps?: string[];
};

export async function askCookingAssistant(
  session: CookingSession,
  userMessage: string,
): Promise<CookingReply> {
  if (IS_MOCK) {
    return mockDelay(mockCookingAnswer(userMessage), 700);
  }

  const { recommendation, currentStep, completedSteps, substitutions, history } = session;

  const reply = await invokeFunction<CookingReply>('cook', {
    recipe: recommendation,
    ingredients: recommendation.requiredIngredients,
    currentStepIndex: currentStep,
    currentStepText: recommendation.steps[currentStep] ?? '',
    remainingSteps: recommendation.steps.slice(currentStep),
    completedSteps,
    substitutions,
    history,
    userMessage,
  });

  return {
    answer: reply.answer ?? "Let's keep going.",
    revisedSteps: reply.revisedSteps?.map((s) => String(s).trim()).filter(Boolean),
  };
}

function mockDelay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
