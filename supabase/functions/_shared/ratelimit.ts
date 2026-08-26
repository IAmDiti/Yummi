/**
 * Abuse protection for the AI functions.
 *
 * The mobile app has no accounts — every request uses the public anon key that
 * ships inside the APK. So the endpoints are effectively open, and each call
 * spends real money on the Anthropic API. This gate caps the damage:
 *
 *   1. per client IP   — stops a single machine hammering the endpoints
 *   2. global per day   — a hard ceiling across ALL callers (the "kill switch")
 *
 * Both limits are fixed-window counters in Postgres (see the ai_rate_limit
 * migration), checked with the service-role key. On any infrastructure error the
 * gate FAILS OPEN — a database blip must not take the app down for real users.
 * The real backstop against a runaway bill is the spend limit on the Anthropic
 * account itself; this is defence in depth.
 *
 * Tune without redeploying by setting function env vars (Supabase dashboard ->
 * Edge Functions -> Secrets):
 *   RL_IP_MAX             (default 50)   requests per IP per window
 *   RL_IP_WINDOW_SEC      (default 900)  window length, seconds
 *   RL_GLOBAL_DAILY_MAX   (default 1500) total requests per day, all callers
 */

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { json } from './cors.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type Verdict =
  | { allowed: true }
  | { allowed: false; scope: 'ip' | 'global'; retryAfterSeconds: number };

/**
 * Call at the top of every AI function handler. Returns a ready-to-send 429
 * `Response` when the caller is over a limit, or `null` when the request may
 * proceed.
 */
export async function enforceRateLimit(req: Request): Promise<Response | null> {
  const verdict = await checkRateLimit(req);
  if (verdict.allowed) return null;

  const message =
    verdict.scope === 'global'
      ? 'Yummi is unusually busy right now. Please try again later.'
      : 'That’s a lot of requests in a short time. Take a short break and try again.';

  return json({ error: message }, 429, {
    'Retry-After': String(verdict.retryAfterSeconds),
  });
}

async function checkRateLimit(req: Request): Promise<Verdict> {
  const ipMax = intEnv('RL_IP_MAX', 50);
  const ipWindowSec = intEnv('RL_IP_WINDOW_SEC', 900);
  const globalDailyMax = intEnv('RL_GLOBAL_DAILY_MAX', 1500);

  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);

  // Per-IP first: an abusive IP is stopped before it can run up the global count.
  if (!(await underLimit(`ip:${ip}`, ipMax, ipWindowSec))) {
    return { allowed: false, scope: 'ip', retryAfterSeconds: ipWindowSec };
  }
  if (!(await underLimit(`global:${day}`, globalDailyMax, 86_400))) {
    return { allowed: false, scope: 'global', retryAfterSeconds: 3_600 };
  }

  // ~2% of allowed requests also sweep away long-dead rows.
  if (Math.random() < 0.02) {
    admin.rpc('ai_rate_limit_gc').then(
      () => {},
      (err) => console.error('ai_rate_limit_gc failed', err?.message ?? err),
    );
  }

  return { allowed: true };
}

async function underLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc('ai_rate_check', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error('ai_rate_check error, failing open:', error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error('ai_rate_check threw, failing open:', err);
    return true;
  }
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function intEnv(name: string, fallback: number): number {
  const n = Number(Deno.env.get(name));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}