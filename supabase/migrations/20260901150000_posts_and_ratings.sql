-- Dish photo posts + ratings + storage bucket.
--
-- Posts are what powers the map ("what people prepared or ordered nearby")
-- and the discover/trending panel. author_name/author_avatar_url are
-- denormalised onto the row (a snapshot at post time) rather than joined to
-- profiles, so bot-seeded posts (see the next migration) don't need a real
-- auth.users row — user_id is simply null for those.

insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

create policy "dish photos are publicly readable" on storage.objects
  for select using (bucket_id = 'dish-photos');

create policy "users upload into their own folder" on storage.objects
  for insert with check (
    bucket_id = 'dish-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users manage their own dish photos" on storage.objects
  for update using (
    bucket_id = 'dish-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete their own dish photos" on storage.objects
  for delete using (
    bucket_id = 'dish-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create table if not exists public.posts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
  is_seed            boolean not null default false,
  author_name        text not null,
  author_avatar_url  text,
  recipe_name        text,
  difficulty         text check (difficulty in ('easy', 'medium', 'hard', 'extra_hard')),
  photo_url          text not null,
  caption            text,
  latitude           double precision not null,
  longitude          double precision not null,
  -- fabricated baseline so bot posts look populated at cold start; only
  -- nonzero for is_seed rows, blended with real ratings in post_trending below
  seed_rating_count  integer not null default 0,
  seed_avg_rating    numeric(3, 2),
  created_at         timestamptz not null default now(),
  constraint posts_owner_or_seed check (
    (is_seed = false and user_id is not null) or (is_seed = true and user_id is null)
  )
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "posts are publicly readable" on public.posts
  for select using (true);

create policy "users insert their own posts" on public.posts
  for insert with check (auth.uid() = user_id and is_seed = false);

create policy "users update their own posts" on public.posts
  for update using (auth.uid() = user_id);

create policy "users delete their own posts" on public.posts
  for delete using (auth.uid() = user_id);

create table if not exists public.post_ratings (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_ratings enable row level security;

create policy "ratings are publicly readable" on public.post_ratings
  for select using (true);

create policy "users rate as themselves" on public.post_ratings
  for insert with check (auth.uid() = user_id);

create policy "users change their own rating" on public.post_ratings
  for update using (auth.uid() = user_id);

create policy "users remove their own rating" on public.post_ratings
  for delete using (auth.uid() = user_id);

-- Blends real post_ratings with each post's fabricated seed baseline, so bot
-- posts look populated at cold start and naturally dilute toward real
-- numbers as real ratings accumulate.
create or replace view public.post_trending as
select
  p.*,
  (p.seed_rating_count + coalesce(r.rating_count, 0))::int as effective_count,
  case
    when (p.seed_rating_count + coalesce(r.rating_count, 0)) = 0 then null
    else round(
      (
        p.seed_rating_count * coalesce(p.seed_avg_rating, 0)
        + coalesce(r.rating_count, 0) * coalesce(r.avg_rating, 0)
      ) / (p.seed_rating_count + coalesce(r.rating_count, 0)),
      2
    )
  end as effective_avg
from public.posts p
left join (
  select post_id, count(*)::int as rating_count, avg(rating)::numeric as avg_rating
  from public.post_ratings
  group by post_id
) r on r.post_id = p.id;

grant select on public.post_trending to anon, authenticated;

notify pgrst, 'reload schema';
