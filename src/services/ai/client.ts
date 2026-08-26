/**
 * Transport for the AI service layer.
 *
 * The rest of the app never talks to an AI provider directly — it calls the
 * functions in vision.ts / recommendations.ts / cooking.ts, which call
 * `invokeFunction` here. Only the Supabase Edge Functions know the provider is
 * Anthropic. To swap providers, rewrite supabase/functions/* and nothing else.
 *
 * If EXPO_PUBLIC_SUPABASE_URL is not set the app runs in MOCK mode and the
 * higher-level services return canned data without ever calling this.
 */

import { AiError } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const IS_MOCK = !SUPABASE_URL || !SUPABASE_ANON_KEY;

const TIMEOUT_MS = 20000;

export async function invokeFunction<T>(
  name: 'vision' | 'recommend' | 'cook',
  body: unknown,
): Promise<T> {
  if (IS_MOCK) {
    throw new AiError(
      'unknown',
      'invokeFunction called in MOCK mode — the calling service should have short-circuited.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiError('timeout', 'The request took too long. Check your connection and try again.');
    }
    throw new AiError('network', 'No connection. Check your internet and try again.');
  }
  clearTimeout(timer);

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // fall through to status handling
  }

  if (!res.ok) {
    const message =
      payload?.error ??
      (res.status >= 500
        ? 'The assistant is having trouble right now. Try again in a moment.'
        : 'Something went wrong. Try again.');
    throw new AiError('ai', message);
  }

  return payload as T;
}
