/**
 * The Supabase client for everything that ISN'T the AI proxy (auth, profiles,
 * posts, ratings, storage) — plain PostgREST/Storage/Auth calls guarded by
 * Postgres RLS, no edge function needed. `null` in mock mode; every caller
 * must check IS_MOCK first (see src/store/auth.ts, src/services/social/*).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { IS_MOCK, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

export const supabase: SupabaseClient | null = IS_MOCK
  ? null
  : createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
