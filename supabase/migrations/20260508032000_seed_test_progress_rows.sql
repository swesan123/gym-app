with target_split as (
  select ws.name as split_name
  from public.workout_splits ws
  where lower(trim(ws.name)) = 'test'
  limit 1
),
fallback_split as (
  select e.split as split_name
  from public.exercises e
  where lower(trim(e.split)) = 'test'
  limit 1
),
resolved_split as (
  select split_name from target_split
  union all
  select split_name from fallback_split
  where not exists (select 1 from target_split)
),
target_exercise as (
  select e.id, e.tracking_type, e.split
  from public.exercises e
  join resolved_split s on lower(trim(e.split)) = lower(trim(s.split_name))
  where lower(trim(e.name)) = 'test'
  limit 1
),
raw_rows as (
  select *
  from (
    values
      ('2026-04-07'::date, '2026-W15'::text, 1::integer, 8::numeric, 20::numeric, 3::numeric, 160::numeric),
      ('2026-04-07'::date, '2026-W15'::text, 2::integer, 8::numeric, 22.5::numeric, 2::numeric, 180::numeric),
      ('2026-04-07'::date, '2026-W15'::text, 3::integer, 8::numeric, 25::numeric, 2::numeric, 200::numeric),
      ('2026-04-14'::date, '2026-W16'::text, 1::integer, 9::numeric, 22.5::numeric, 3::numeric, 202.5::numeric),
      ('2026-04-14'::date, '2026-W16'::text, 2::integer, 9::numeric, 25::numeric, 2::numeric, 225::numeric),
      ('2026-04-14'::date, '2026-W16'::text, 3::integer, 9::numeric, 27.5::numeric, 2::numeric, 247.5::numeric),
      ('2026-04-21'::date, '2026-W17'::text, 1::integer, 10::numeric, 25::numeric, 3::numeric, 250::numeric),
      ('2026-04-21'::date, '2026-W17'::text, 2::integer, 10::numeric, 27.5::numeric, 2::numeric, 275::numeric),
      ('2026-04-21'::date, '2026-W17'::text, 3::integer, 10::numeric, 30::numeric, 1::numeric, 300::numeric),
      ('2026-04-28'::date, '2026-W18'::text, 1::integer, 10::numeric, 27.5::numeric, 3::numeric, 275::numeric),
      ('2026-04-28'::date, '2026-W18'::text, 2::integer, 10::numeric, 30::numeric, 2::numeric, 300::numeric),
      ('2026-04-28'::date, '2026-W18'::text, 3::integer, 10::numeric, 32.5::numeric, 1::numeric, 325::numeric)
  ) as v(workout_date, week, set_number, reps, weight, rir, volume)
),
insert_workouts as (
  insert into public.workouts (date, week, split, status)
  select distinct rr.workout_date, rr.week, rs.split_name, 'completed'
  from raw_rows rr
  cross join resolved_split rs
  where exists (select 1 from target_exercise)
    and not exists (
      select 1
      from public.workouts w
      where w.date = rr.workout_date
        and w.week = rr.week
        and lower(trim(w.split)) = lower(trim(rs.split_name))
        and w.status = 'completed'
    )
  returning id
)
insert into public.workout_sets (
  workout_id,
  exercise_id,
  set_number,
  reps,
  weight,
  rir,
  duration_seconds,
  volume
)
select
  w.id as workout_id,
  te.id as exercise_id,
  rr.set_number,
  rr.reps,
  rr.weight,
  rr.rir,
  case when te.tracking_type = 'timed' then rr.reps else null end as duration_seconds,
  rr.volume
from raw_rows rr
join resolved_split rs on true
join target_exercise te on true
join public.workouts w
  on w.date = rr.workout_date
 and w.week = rr.week
 and lower(trim(w.split)) = lower(trim(rs.split_name))
 and w.status = 'completed'
on conflict (workout_id, exercise_id, set_number)
do update set
  reps = excluded.reps,
  weight = excluded.weight,
  rir = excluded.rir,
  duration_seconds = excluded.duration_seconds,
  volume = excluded.volume;
