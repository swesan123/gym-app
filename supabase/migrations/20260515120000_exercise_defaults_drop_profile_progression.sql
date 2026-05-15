-- Plan: all exercises default_reps = 10, progressive_overload_pct = 2.5 (replaces bulk UI).
update public.exercises
set
  default_reps = 10,
  progressive_overload_pct = 2.5;

alter table public.user_training_profile
  drop column if exists progression_base_pct;
