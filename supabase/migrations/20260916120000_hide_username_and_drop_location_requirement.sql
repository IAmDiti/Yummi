-- 1. Let a user choose to post/rate under "***" instead of their display
--    name. Denormalised the same way author_name already is (a snapshot at
--    post time, not a live join) -- see src/services/social/posts.ts.
alter table public.profiles
  add column if not exists hide_username boolean not null default false;

-- 2. The map feature (and the location it captured per post) has been
-- removed from the app. Existing rows keep whatever coordinates they have;
-- new posts no longer supply any, so the columns can no longer be required.
alter table public.posts
  alter column latitude drop not null,
  alter column longitude drop not null;

notify pgrst, 'reload schema';
