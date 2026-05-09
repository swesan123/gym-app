alter table public.exercises
  add column if not exists default_reps integer,
  add column if not exists progressive_overload_pct numeric,
  add column if not exists sort_order integer not null default 0,
  add column if not exists stretch_kind text not null default 'none';

alter table public.exercises drop constraint if exists exercises_stretch_kind_check;

alter table public.exercises
  add constraint exercises_stretch_kind_check
  check (stretch_kind in ('none', 'dynamic', 'static'));

with ranked as (
  select
    id,
    (row_number() over (
      partition by split
      order by created_at asc, id asc
    ) - 1) as ord
  from public.exercises
)
update public.exercises e
set sort_order = ranked.ord
from ranked
where e.id = ranked.id;

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
where w.status = 'completed'
group by 1, 2;

grant select on public.monthly_volume_by_split to anon, authenticated;
