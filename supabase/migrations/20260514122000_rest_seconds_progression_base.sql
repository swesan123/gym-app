alter table public.exercises
  add column if not exists rest_seconds integer;

alter table public.exercises drop constraint if exists exercises_rest_seconds_check;
alter table public.exercises
  add constraint exercises_rest_seconds_check
  check (rest_seconds is null or rest_seconds >= 0);

alter table public.user_training_profile
  add column if not exists progression_base_pct numeric;
