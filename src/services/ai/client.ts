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

import { t } from '../../i18n';
import { IS_MOCK, SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';
import { AiError } from '../types';

export { IS_MOCK };

/**
 * Per-endpoint request timeouts. These are non-streaming Claude calls made from
 * an Edge Function, so the client waits for the whole model response in one go.
 * `recommend` generates a batch of 5-6 full recipes (~5k output tokens) and
 * routinely takes 30-40s; the others are much shorter. The timeout only trips
 * on a genuinely slow server — a real network failure rejects `fetch`
 * immediately regardless — so these are deliberately generous.
 */
const TIMEOUT_MS: Record<'vision' | 'recommend' | 'cook', number> = {
  vision: 45000,
  recommend: 75000,
  cook: 45000,
};

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
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS[name]);

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
      throw new AiError('timeout', t('ai.timeout'));
    }
    throw new AiError('network', t('ai.network'));
  }
  clearTimeout(timer);

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // fall through to status handling
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new AiError('ai', payload?.error ?? t('ai.rateLimited'));
    }
    const message =
      payload?.error ?? (res.status >= 500 ? t('ai.serverError') : t('ai.genericError'));
    throw new AiError('ai', message);
  }

  return payload as T;
}
