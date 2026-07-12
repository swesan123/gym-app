-- Progress: RIR-adjusted volume S = V × 1/(1 − 0.03×RIR).
-- V is stored workout_sets.volume; null RIR counts as 0 (plain volume).

create or replace view public.weekly_rep_capacity_by_exercise
with (security_invoker = true) as
select distinct on (w.week, e.id)
  w.week,
  e.id as exercise_id,
  e.name as exercise,
  e.muscle,
  (ws.volume * (1.0 / nullif(1.0 - 0.03 * coalesce(ws.rir, 0), 0)))::numeric
    as max_adjusted_volume,
  ws.volume as best_volume,
  ws.reps as best_reps,
  ws.rir as best_rir,
  ws.weight as best_weight
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.volume is not null
order by
  w.week,
  e.id,
  (ws.volume * (1.0 / nullif(1.0 - 0.03 * coalesce(ws.rir, 0), 0))) desc,
  ws.completed_at desc nulls last;

grant select on public.weekly_rep_capacity_by_exercise to anon, authenticated;

create or replace view public.weekly_rep_capacity_by_split
with (security_invoker = true) as
select
  w.week,
  es.split_name as split,
  e.name as exercise,
  e.muscle,
  max(
    (ws.volume * (1.0 / nullif(1.0 - 0.03 * coalesce(ws.rir, 0), 0)))::numeric
  ) as max_adjusted_volume
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
join public.exercise_splits es on es.exercise_id = e.id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.volume is not null
group by w.week, es.split_name, e.name, e.muscle;

grant select on public.weekly_rep_capacity_by_split to anon, authenticated;

create or replace view public.monthly_rep_capacity_by_exercise
with (security_invoker = true) as
select
  date_trunc('month', w.date)::date as month_start,
  e.id as exercise_id,
  e.name as exercise,
  e.muscle,
  sum(
    (ws.volume * (1.0 / nullif(1.0 - 0.03 * coalesce(ws.rir, 0), 0)))::numeric
  ) as total_adjusted_volume
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.volume is not null
group by date_trunc('month', w.date), e.id, e.name, e.muscle
order by month_start desc, e.name asc;

grant select on public.monthly_rep_capacity_by_exercise to anon, authenticated;
