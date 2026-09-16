/**
 * Posts (dish photos) — plain CRUD against Postgres via PostgREST, gated by
 * RLS (see supabase/migrations/*_posts_and_ratings.sql). No edge function
 * involved. Mirrors the mock-mode pattern used throughout src/services/ai/*
 * so /discover works without a backend.
 */

import { IS_MOCK } from '../env';
import { supabase } from '../supabase';
import type { Difficulty, Post } from '../types';
import { mockDelay, mockPosts } from './mock';

function mapRow(row: Record<string, any>): Post {
  return {
    id: row.id,
    userId: row.user_id,
    isSeed: !!row.is_seed,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    recipeName: row.recipe_name,
    difficulty: row.difficulty,
    photoUrl: row.photo_url,
    caption: row.caption,
    createdAt: row.created_at,
    ratingCount: Number(row.effective_count ?? 0),
    avgRating:
      row.effective_avg === null || row.effective_avg === undefined
        ? null
        : Number(row.effective_avg),
  };
}

export async function getTrendingPosts(limit = 20): Promise<Post[]> {
  if (IS_MOCK) {
    return mockDelay(
      [...mockPosts].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, limit),
      500,
    );
  }
  const { data, error } = await supabase!
    .from('post_trending')
    .select('*')
    .order('effective_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export type CreatePostInput = {
  userId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  recipeName?: string | null;
  difficulty?: Difficulty | null;
  caption?: string | null;
  /** local file URI from the camera capture */
  photoUri: string;
};

export async function createPost(input: CreatePostInput): Promise<Post> {
  if (IS_MOCK) {
    const post: Post = {
      id: `mock-post-${Date.now()}`,
      userId: input.userId,
      isSeed: false,
      authorName: input.authorName,
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      recipeName: input.recipeName ?? null,
      difficulty: input.difficulty ?? null,
      photoUrl: input.photoUri,
      caption: input.caption ?? null,
      createdAt: new Date().toISOString(),
      ratingCount: 0,
      avgRating: null,
    };
    mockPosts.unshift(post);
    return mockDelay(post, 600);
  }

  const path = `${input.userId}/${Date.now()}.jpg`;
  const res = await fetch(input.photoUri);
  const arrayBuffer = await res.arrayBuffer();
  const { error: uploadError } = await supabase!.storage
    .from('dish-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase!.storage.from('dish-photos').getPublicUrl(path);

  const { data, error } = await supabase!
    .from('posts')
    .insert({
      user_id: input.userId,
      is_seed: false,
      author_name: input.authorName,
      author_avatar_url: input.authorAvatarUrl ?? null,
      recipe_name: input.recipeName ?? null,
      difficulty: input.difficulty ?? null,
      photo_url: urlData.publicUrl,
      caption: input.caption ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow({ ...data, effective_count: 0, effective_avg: null });
}
