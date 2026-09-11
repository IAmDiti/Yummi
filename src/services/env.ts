/**
 * Single source of truth for the Supabase project this app talks to, and
 * whether a backend is configured at all. Used by both the AI transport
 * (src/services/ai/client.ts) and the Supabase client (src/services/supabase.ts)
 * so there's exactly one definition of "mock mode".
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const IS_MOCK = !SUPABASE_URL || !SUPABASE_ANON_KEY;
