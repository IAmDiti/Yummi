/**
 * Canned auth used when no backend is configured (mirrors src/services/ai/mock.ts).
 * The app behaves as always signed in, with a small local profile, so profile
 * editing and dietary preferences can still be demoed without a Supabase project.
 */

import type { Profile } from '../types';

export const mockUser = { id: 'mock-user', email: 'demo@yummi.app' };

export const initialMockProfile: Profile = {
  id: mockUser.id,
  displayName: 'Demo Cook',
  avatarUrl: null,
  dietaryTags: [],
};

export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
