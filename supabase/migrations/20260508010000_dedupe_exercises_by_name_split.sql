with ranked as (
  select
    id,
    split,
    lower(trim(name)) as normalized_name,
    created_at,
    row_number() over (
      partition by split, lower(trim(name))
      order by created_at asc, id asc
    ) as rn,
    first_value(id) over (
      partition by split, lower(trim(name))
      order by created_at asc, id asc
    ) as survivor_id
  from public.exercises
),
duplicates as (
  select id, survivor_id
  from ranked
  where rn > 1
),
move_sets_to_survivors as (
  insert into public.workout_sets (
    workout_id,
    exercise_id,
    set_number,
    reps,
    weight,
    rir,
    duration_seconds,
    volume,
    note,
    created_at
  )
  select
    ws.workout_id,
    d.survivor_id as exercise_id,
    ws.set_number,
    ws.reps,
    ws.weight,
    ws.rir,
    ws.duration_seconds,
    ws.volume,
    ws.note,
    ws.created_at
  from public.workout_sets ws
  join duplicates d on d.id = ws.exercise_id
  on conflict (workout_id, exercise_id, set_number)
  do update set
    reps = coalesce(excluded.reps, public.workout_sets.reps),
    weight = coalesce(excluded.weight, public.workout_sets.weight),
    rir = coalesce(excluded.rir, public.workout_sets.rir),
    duration_seconds = coalesce(excluded.duration_seconds, public.workout_sets.duration_seconds),
    volume = coalesce(excluded.volume, public.workout_sets.volume),
    note = coalesce(excluded.note, public.workout_sets.note)
  returning workout_id
),
delete_old_duplicate_sets as (
  delete from public.workout_sets ws_dup
  using duplicates d
  where ws_dup.exercise_id = d.id
  returning ws_dup.id
)
select count(*) from delete_old_duplicate_sets;

with ranked as (
  select
    id,
    split,
    lower(trim(name)) as normalized_name,
    created_at,
    row_number() over (
      partition by split, lower(trim(name))
      order by created_at asc, id asc
    ) as rn
  from public.exercises
)
delete from public.exercises e
using ranked r
where e.id = r.id
  and r.rn > 1;
