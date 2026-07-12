-- Restore historical progress data excluded by rep-capacity views (#80).
-- Pre-#73 completed sets never received completed_at; backfill from workout timestamps.
-- Also fix split filtering to use exercise_splits (catalog splits) instead of workouts.split.

update public.workout_sets ws
set completed_at = coalesce(
  w.completed_at,
  (w.date::timestamp at time zone 'UTC'),
  w.created_at,
  now()
)
from public.workouts w
where ws.workout_id = w.id
  and w.status = 'completed'
  and ws.completed_at is null
  and ws.reps is not null
  and exists (
    select 1
    from public.exercises e
    where e.id = ws.exercise_id
      and coalesce(e.stretch_kind, 'none') = 'none'
  );

create or replace view public.weekly_rep_capacity_by_split
with (security_invoker = true) as
select
  w.week,
  es.split_name as split,
  e.name as exercise,
  e.muscle,
  max(coalesce(ws.reps, 0) + coalesce(ws.rir, 0))::numeric as max_rep_capacity
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
join public.exercise_splits es on es.exercise_id = e.id
where w.status = 'completed'
  and ws.completed_at is not null
  and coalesce(e.stretch_kind, 'none') = 'none'
  and ws.reps is not null
group by w.week, es.split_name, e.name, e.muscle;

grant select on public.weekly_rep_capacity_by_split to anon, authenticated;
