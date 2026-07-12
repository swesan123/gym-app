-- Replace volume-based progress views with RIR-adjusted rep capacity (#80).
-- Rep capacity = reps + rir for completed sets (marked Done).

create or replace view public.weekly_rep_capacity_by_exercise
with (security_invoker = true) as
select distinct on (w.week, e.id)
  w.week,
  e.id as exercise_id,
  e.name as exercise,
  e.muscle,
  (coalesce(ws.reps, 0) + coalesce(ws.rir, 0))::numeric as max_rep_capacity,
  ws.reps as best_reps,
  ws.rir as best_rir,
  ws.weight as best_weight
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.reps is not null
order by
  w.week,
  e.id,
  (coalesce(ws.reps, 0) + coalesce(ws.rir, 0)) desc,
  ws.completed_at desc nulls last;

grant select on public.weekly_rep_capacity_by_exercise to anon, authenticated;

create or replace view public.weekly_rep_capacity_by_split
with (security_invoker = true) as
select
  w.week,
  w.split,
  e.name as exercise,
  e.muscle,
  max(coalesce(ws.reps, 0) + coalesce(ws.rir, 0))::numeric as max_rep_capacity
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.reps is not null
group by w.week, w.split, e.name, e.muscle;

grant select on public.weekly_rep_capacity_by_split to anon, authenticated;

create or replace view public.monthly_rep_capacity_by_exercise
with (security_invoker = true) as
select
  date_trunc('month', w.date)::date as month_start,
  e.id as exercise_id,
  e.name as exercise,
  e.muscle,
  max(coalesce(ws.reps, 0) + coalesce(ws.rir, 0))::numeric as max_rep_capacity
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.reps is not null
group by date_trunc('month', w.date), e.id, e.name, e.muscle
order by month_start desc, e.name asc;

grant select on public.monthly_rep_capacity_by_exercise to anon, authenticated;

drop view if exists public.monthly_volume_by_exercise;
drop view if exists public.weekly_volume_by_exercise;
drop view if exists public.monthly_volume_by_split;
drop view if exists public.weekly_volume_by_split;
drop view if exists public.weekly_volume_summary;
