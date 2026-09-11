-- User profiles: one row per auth user, holding display info and dietary
-- preferences. The `recommend` edge function treats dietary_tags as HARD
-- constraints, not preferences (see supabase/functions/recommend/index.ts).
--
-- A stub row is created automatically for every new auth.users row (see the
-- trigger below) so the rest of the app never needs "create profile if
-- missing" logic — every signed-in user already has a profiles row.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  dietary_tags  text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_dietary_tags_valid check (
    dietary_tags <@ array[
      'vegetarian','vegan','gluten_free','dairy_free','nut_allergy',
      'shellfish_allergy','halal','kosher','low_carb','pescatarian'
    ]::text[]
  )
);

alter table public.profiles enable row level security;

-- Profiles are social-adjacent (author names on posts, etc.) so they're
-- readable by anyone, but only editable by their own owner.
create policy "profiles are publicly readable" on public.profiles
  for select using (true);

create policy "users insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "users update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a stub profile row whenever a new auth user signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';
