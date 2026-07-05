-- Fix Supabase Security Advisor permissive RLS policy warnings (lint 0024).
-- All existing "*_allow_all" policies use `FOR ALL USING (true) WITH CHECK (true)`,
-- which makes RLS a no-op for INSERT/UPDATE/DELETE — anyone with the anon key
-- could mutate data directly via the Supabase REST API.
--
-- The app itself now talks to Supabase using the service role key (see
-- lib/supabase/server.ts), which bypasses RLS entirely, so none of these
-- server actions are affected by tightening anon/authenticated access.
-- Replace each allow-all policy with a SELECT-only policy for anon/authenticated;
-- writes are no longer permitted for those roles (default deny once RLS is enabled).

drop policy if exists "exercises_allow_all" on public.exercises;
create policy "exercises_select_public"
  on public.exercises for select
  to anon, authenticated
  using (true);

drop policy if exists "workouts_allow_all" on public.workouts;
create policy "workouts_select_public"
  on public.workouts for select
  to anon, authenticated
  using (true);

drop policy if exists "workout_sets_allow_all" on public.workout_sets;
create policy "workout_sets_select_public"
  on public.workout_sets for select
  to anon, authenticated
  using (true);

drop policy if exists "weight_options_allow_all" on public.weight_options;
create policy "weight_options_select_public"
  on public.weight_options for select
  to anon, authenticated
  using (true);

drop policy if exists "workout_splits_allow_all" on public.workout_splits;
create policy "workout_splits_select_public"
  on public.workout_splits for select
  to anon, authenticated
  using (true);

drop policy if exists "exercise_splits_allow_all" on public.exercise_splits;
create policy "exercise_splits_select_public"
  on public.exercise_splits for select
  to anon, authenticated
  using (true);

drop policy if exists "user_training_profile_allow_all" on public.user_training_profile;
create policy "user_training_profile_select_public"
  on public.user_training_profile for select
  to anon, authenticated
  using (true);
