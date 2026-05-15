-- Progress volume: exclude dynamic/static stretches (stretch_kind != 'none')
create or replace view public.weekly_volume_by_split as
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

create or replace view public.monthly_volume_by_split as
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
