-- Rate limiting for the AI edge functions.
--
-- The app has no user accounts, so every request carries the same public anon
-- key that ships inside the APK. Without this, anyone who unpacks the app can
-- call vision/recommend/cook in a loop and run up the project's Anthropic bill.
--
-- Strategy: a single fixed-window counter table keyed by an arbitrary string.
-- The edge functions check two keys per request — one per client IP, one global
-- per day (the "kill switch") — via ai_rate_check(). RLS is enabled with no
-- policies so only service_role (which bypasses RLS) can touch the table.

create table if not exists public.ai_rate_limit (
  key         text primary key,
  count       integer not null default 0,
  expires_at  timestamptz not null
);

create index if not exists ai_rate_limit_expires_at_idx
  on public.ai_rate_limit (expires_at);

alter table public.ai_rate_limit enable row level security;
-- (deliberately no policies)

-- Atomic fixed-window check. Increments the counter for p_key and returns true
-- while the caller is still at or under p_limit for the current window. The
-- window resets automatically the first time it is hit after expires_at passes.
create or replace function public.ai_rate_check(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into public.ai_rate_limit as r (key, count, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.expires_at < now() then 1 else r.count + 1 end,
    expires_at = case
      when r.expires_at < now() then now() + make_interval(secs => p_window_seconds)
      else r.expires_at
    end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Housekeeping: drop rows whose window ended more than a day ago. Called
-- opportunistically from the edge functions.
create or replace function public.ai_rate_limit_gc() returns void
language sql
as $$
  delete from public.ai_rate_limit where expires_at < now() - interval '1 day';
$$;

revoke execute on function public.ai_rate_check(text, integer, integer) from public;
revoke execute on function public.ai_rate_limit_gc() from public;
grant execute on function public.ai_rate_check(text, integer, integer) to service_role;
grant execute on function public.ai_rate_limit_gc() to service_role;

notify pgrst, 'reload schema';