/**
 * Canned posts used when no backend is configured (mirrors src/services/ai/mock.ts),
 * so /discover is still clickable in demo mode. A small in-memory array,
 * mutated locally by createPost — not persisted.
 */

import type { Post } from '../types';

export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

export const mockPosts: Post[] = [
  {
    id: 'mock-post-1',
    userId: null,
    isSeed: true,
    authorName: 'Chef Ana',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=chef-ana',
    recipeName: 'Spicy Chicken Quesadilla',
    difficulty: 'easy',
    photoUrl: 'https://picsum.photos/seed/chef-ana-quesadilla/800/600',
    caption: 'Weeknight favourite, ready in 15 minutes!',
    createdAt: hoursAgo(6),
    ratingCount: 128,
    avgRating: 4.6,
  },
  {
    id: 'mock-post-2',
    userId: null,
    isSeed: true,
    authorName: 'Marco B.',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=marco-b',
    recipeName: 'Slow-Braised Chicken Ragu',
    difficulty: 'extra_hard',
    photoUrl: 'https://picsum.photos/seed/marco-ragu/800/600',
    caption: 'Took all afternoon but so worth it.',
    createdAt: hoursAgo(30),
    ratingCount: 340,
    avgRating: 4.9,
  },
  {
    id: 'mock-post-3',
    userId: null,
    isSeed: true,
    authorName: 'Priya S.',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=priya-s',
    recipeName: 'One-Pan Chicken & Rice',
    difficulty: 'medium',
    photoUrl: 'https://picsum.photos/seed/priya-chicken-rice/800/600',
    caption: null,
    createdAt: hoursAgo(12),
    ratingCount: 87,
    avgRating: 4.3,
  },
  {
    id: 'mock-post-4',
    userId: null,
    isSeed: true,
    authorName: 'Diego R.',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=diego-r',
    recipeName: 'Fried Egg & Cheese Tortilla Melt',
    difficulty: 'easy',
    photoUrl: 'https://picsum.photos/seed/diego-tortilla/800/600',
    caption: 'Breakfast of champions.',
    createdAt: hoursAgo(3),
    ratingCount: 52,
    avgRating: 4.1,
  },
  {
    id: 'mock-post-5',
    userId: null,
    isSeed: true,
    authorName: 'Chef Ana',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=chef-ana',
    recipeName: 'Stuffed Chicken with Tomato Reduction',
    difficulty: 'hard',
    photoUrl: 'https://picsum.photos/seed/chef-ana-stuffed-chicken/800/600',
    caption: 'Sunday dinner, finally nailed the stuffing.',
    createdAt: hoursAgo(50),
    ratingCount: 210,
    avgRating: 4.7,
  },
  {
    id: 'mock-post-6',
    userId: null,
    isSeed: true,
    authorName: 'Yuki T.',
    authorAvatarUrl: 'https://i.pravatar.cc/150?u=yuki-t',
    recipeName: 'Cheese Omelette with Spicy Tomato',
    difficulty: 'easy',
    photoUrl: 'https://picsum.photos/seed/yuki-omelette/800/600',
    caption: null,
    createdAt: hoursAgo(20),
    ratingCount: 63,
    avgRating: 4.4,
  },
];
