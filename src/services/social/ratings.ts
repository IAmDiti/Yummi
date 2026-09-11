/**
 * Ratings on posts — one per (post, user), upserted so re-rating changes the
 * existing rating rather than creating a duplicate.
 */

import { IS_MOCK } from '../env';
import { supabase } from '../supabase';
import { mockDelay } from './mock';

export async function ratePost(postId: string, userId: string, rating: number): Promise<void> {
  if (IS_MOCK) {
    await mockDelay(undefined, 300);
    return;
  }
  const { error } = await supabase!
    .from('post_ratings')
    .upsert({ post_id: postId, user_id: userId, rating }, { onConflict: 'post_id,user_id' });
  if (error) throw error;
}
