-- Create exercise-scoped volume views (volume calculated across all splits)

-- Weekly volume grouped by exercise (not split)
create or replace view public.weekly_volume_by_exercise as
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

-- Monthly volume grouped by exercise (not split)
create or replace view public.monthly_volume_by_exercise as
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
