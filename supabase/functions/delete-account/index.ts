/**
 * Account deletion — required by Google Play's User Data policy for any app
 * that supports creating an account: users must be able to delete their
 * account and associated data, both in-app (see app/profile.tsx) and via a
 * web page for people who can no longer access the app (see the published
 * "Delete your account" page linked from the privacy policy).
 *
 * Deletes, immediately and irreversibly:
 *   - the auth.users row (the sign-in itself)
 *   - public.profiles              (FK "on delete cascade" from auth.users)
 *   - public.posts the user made   (FK "on delete cascade")
 *   - public.post_ratings they gave (FK "on delete cascade")
 *   - their uploaded dish photos in the "dish-photos" storage bucket — NOT
 *     covered by any FK, so removed explicitly before the user row goes away
 *
 * Auth is deliberately not handled by config.toml's `verify_jwt` alone (that
 * only checks *some* valid JWT was sent, and the app's other functions are
 * happily called with the public anon key). Here the caller must be a real
 * signed-in user acting on their own account, so we resolve identity from the
 * caller's own access token via a client scoped to it, and only ever delete
 * *that* user's id — never one taken from the request body.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await callerClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: 'You need to be signed in to delete your account.' }, 401);
  }

  try {
    // Storage objects aren't covered by the auth.users FK cascade — remove
    // this user's uploaded photos first so nothing is orphaned in the bucket.
    const { data: files, error: listErr } = await admin.storage
      .from('dish-photos')
      .list(user.id);
    if (listErr) throw listErr;
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error: removeErr } = await admin.storage.from('dish-photos').remove(paths);
      if (removeErr) throw removeErr;
    }

    // Deleting the auth user cascades to profiles, posts, and post_ratings.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    return json({ success: true });
  } catch (err) {
    console.error('delete-account error', err);
    return json(
      { error: err instanceof Error ? err.message : 'Could not delete the account. Try again.' },
      500,
    );
  }
});
