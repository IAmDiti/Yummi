-- Bot-seeded posts so the map and trending panel aren't empty before any
-- real user has posted. Fictional authors, hotlinked stock photos, spread
-- across difficulty tiers and a handful of real city centers so the map
-- looks populated regardless of where a demo device actually is. Kept in its
-- own migration, separate from the schema, so it's easy to identify or
-- re-seed independently.

insert into public.posts
  (user_id, is_seed, author_name, author_avatar_url, recipe_name, difficulty, photo_url, caption, latitude, longitude, seed_rating_count, seed_avg_rating, created_at)
values
  (null, true, 'Chef Ana', 'https://i.pravatar.cc/150?u=chef-ana', 'Spicy Chicken Quesadilla', 'easy',
   'https://picsum.photos/seed/chef-ana-quesadilla/800/600', 'Weeknight favourite, ready in 15 minutes!',
   40.7328, -73.9868, 128, 4.60, now() - interval '6 hours'),

  (null, true, 'Marco B.', 'https://i.pravatar.cc/150?u=marco-b', 'Slow-Braised Chicken Ragu', 'extra_hard',
   'https://picsum.photos/seed/marco-ragu/800/600', 'Took all afternoon but so worth it.',
   41.9028, 12.4964, 340, 4.90, now() - interval '30 hours'),

  (null, true, 'Priya S.', 'https://i.pravatar.cc/150?u=priya-s', 'One-Pan Chicken & Rice', 'medium',
   'https://picsum.photos/seed/priya-chicken-rice/800/600', null,
   19.0760, 72.8777, 87, 4.30, now() - interval '12 hours'),

  (null, true, 'Diego R.', 'https://i.pravatar.cc/150?u=diego-r', 'Fried Egg & Cheese Tortilla Melt', 'easy',
   'https://picsum.photos/seed/diego-tortilla/800/600', 'Breakfast of champions.',
   -23.5505, -46.6333, 52, 4.10, now() - interval '3 hours'),

  (null, true, 'Chef Ana', 'https://i.pravatar.cc/150?u=chef-ana', 'Stuffed Chicken with Tomato Reduction', 'hard',
   'https://picsum.photos/seed/chef-ana-stuffed-chicken/800/600', 'Sunday dinner, finally nailed the stuffing.',
   40.7484, -73.9857, 210, 4.70, now() - interval '50 hours'),

  (null, true, 'Yuki T.', 'https://i.pravatar.cc/150?u=yuki-t', 'Cheese Omelette with Spicy Tomato', 'easy',
   'https://picsum.photos/seed/yuki-omelette/800/600', null,
   35.6762, 139.6503, 63, 4.40, now() - interval '20 hours'),

  (null, true, 'Sofia L.', 'https://i.pravatar.cc/150?u=sofia-l', 'Slow-Braised Chicken Ragu', 'extra_hard',
   'https://picsum.photos/seed/sofia-ragu/800/600', 'Three-hour braise, zero regrets.',
   51.5074, -0.1278, 156, 4.80, now() - interval '40 hours'),

  (null, true, 'Ahmed K.', 'https://i.pravatar.cc/150?u=ahmed-k', 'One-Pan Chicken & Rice', 'medium',
   'https://picsum.photos/seed/ahmed-chicken-rice/800/600', null,
   25.2048, 55.2708, 45, 4.20, now() - interval '9 hours'),

  (null, true, 'Chloe M.', 'https://i.pravatar.cc/150?u=chloe-m', 'Stuffed Chicken with Tomato Reduction', 'hard',
   'https://picsum.photos/seed/chloe-stuffed-chicken/800/600', 'First time it actually held together.',
   48.8566, 2.3522, 98, 4.50, now() - interval '15 hours'),

  (null, true, 'Ben T.', 'https://i.pravatar.cc/150?u=ben-t', 'Spicy Chicken Quesadilla', 'easy',
   'https://picsum.photos/seed/ben-quesadilla/800/600', 'Sunday footy snack.',
   -33.8688, 151.2093, 33, 4.00, now() - interval '2 hours');

notify pgrst, 'reload schema';
