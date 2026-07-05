-- Fix Supabase Security Advisor SECURITY DEFINER view warnings (lint 0010).
-- By default a Postgres view runs with the view owner's permissions, bypassing
-- RLS on the underlying tables for the querying role. Recreate each volume
-- view with security_invoker = true so RLS is evaluated as the caller
-- (anon/authenticated), not the view owner. Definitions are otherwise
-- unchanged from their most recent migration.

create or replace view public.weekly_volume_summary
with (security_invoker = true) as
select
  w.week,
  e.name as exercise,
  e.muscle,
  count(ws.id)::bigint as total_sets,
  sum(ws.reps) as total_reps,
  sum(ws.volume) as total_volume
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
group by w.week, e.name, e.muscle;

grant select on public.weekly_volume_summary to anon, authenticated;

create or replace view public.weekly_volume_by_split
with (security_invoker = true) as
select
  w.week,
  w.split,
  e.name as exercise,
  e.muscle,
  count(ws.id)::bigint as total_sets,
  sum(ws.reps) as total_reps,
  sum(ws.volume) as total_volume
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and coalesce(e.stretch_kind, 'none') = 'none'
group by w.week, w.split, e.name, e.muscle;

grant select on public.weekly_volume_by_split to anon, authenticated;

create or replace view public.monthly_volume_by_split
with (security_invoker = true) as
select
  date_trunc('month', w.date)::date as month_start,
  w.split,
  sum(ws.volume) as total_volume,
  sum(ws.reps) as total_reps,
  count(ws.id)::bigint as total_sets
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and coalesce(e.stretch_kind, 'none') = 'none'
group by 1, 2;

grant select on public.monthly_volume_by_split to anon, authenticated;

create or replace view public.weekly_volume_by_exercise
with (security_invoker = true) as
select
  w.week,
  e.id as exercise_id,
  e.name as exercise,
  e.muscle,
  count(ws.id)::bigint as total_sets,
  sum(ws.reps) as total_reps,
  sum(ws.volume) as total_volume
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and coalesce(e.stretch_kind, 'none') = 'none'
group by w.week, e.id, e.name, e.muscle
order by w.week desc, e.name asc;

grant select on public.weekly_volume_by_exercise to anon, authenticated;

create or replace view public.monthly_volume_by_exercise
with (security_invoker = true) as
select
  date_trunc('month', w.date)::date as month_start,
  e.id as exercise_id,
  e.name as exercise,
  e.muscle,
  sum(ws.volume) as total_volume,
  sum(ws.reps) as total_reps,
  count(ws.id)::bigint as total_sets
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and coalesce(e.stretch_kind, 'none') = 'none'
group by date_trunc('month', w.date), e.id, e.name, e.muscle
order by month_start desc, e.name asc;

grant select on public.monthly_volume_by_exercise to anon, authenticated;
