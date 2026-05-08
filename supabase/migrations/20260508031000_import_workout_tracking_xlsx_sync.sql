with raw_rows as (
  select *
  from (
    values
      ('Leg Press', 1::integer, 10.0::numeric, 180.0::numeric, 3.0::numeric, 'LowerA', 1800::numeric, '3/23/2026', '2026-W13', null::text),
      ('Leg Press', 2::integer, 10.0::numeric, 180.0::numeric, 2.0::numeric, 'LowerA', 1800::numeric, '3/23/2026', '2026-W13', null::text),
      ('Leg Press', 3::integer, 10.0::numeric, 180.0::numeric, 2.0::numeric, 'LowerA', 1800::numeric, '3/23/2026', '2026-W13', null::text),
      ('Seated Calf Raise', 1::integer, 10.0::numeric, 10.0::numeric, 5.0::numeric, 'LowerB', 100::numeric, '3/23/2026', '2026-W13', null::text),
      ('Seated Calf Raise', 2::integer, 10.0::numeric, 25.0::numeric, 3.0::numeric, 'LowerB', 250::numeric, '3/23/2026', '2026-W13', null::text),
      ('Seated Calf Raise', 3::integer, 10.0::numeric, 45.0::numeric, 2.0::numeric, 'LowerB', 450::numeric, '3/23/2026', '2026-W13', null::text),
      ('Leg Curl', 1::integer, 10.0::numeric, 60.0::numeric, 3.0::numeric, 'LowerB', 600::numeric, '3/23/2026', '2026-W13', null::text),
      ('Leg Curl', 2::integer, 10.0::numeric, 60.0::numeric, 2.0::numeric, 'LowerB', 600::numeric, '3/23/2026', '2026-W13', null::text),
      ('Leg Curl', 3::integer, 10.0::numeric, 60.0::numeric, 2.0::numeric, 'LowerB', 600::numeric, '3/23/2026', '2026-W13', null::text),
      ('Goblet Squat', 1::integer, 10.0::numeric, 15.0::numeric, 5.0::numeric, 'LowerC', 150::numeric, '3/23/2026', '2026-W13', null::text),
      ('Goblet Squat', 2::integer, 10.0::numeric, 15.0::numeric, 4.0::numeric, 'LowerC', 150::numeric, '3/23/2026', '2026-W13', null::text),
      ('Goblet Squat', 3::integer, 10.0::numeric, 15.0::numeric, 4.0::numeric, 'LowerC', 150::numeric, '3/23/2026', '2026-W13', null::text),
      ('Weighted Lunges', 1::integer, 10.0::numeric, 5.0::numeric, 4.0::numeric, 'LowerC', 50::numeric, '3/23/2026', '2026-W13', null::text),
      ('Weighted Lunges', 2::integer, 10.0::numeric, 5.0::numeric, 4.0::numeric, 'LowerC', 50::numeric, '3/23/2026', '2026-W13', null::text),
      ('Weighted Lunges', 3::integer, 10.0::numeric, 5.0::numeric, 4.0::numeric, 'LowerC', 50::numeric, '3/23/2026', '2026-W13', null::text),
      ('Romanian Deadlift', 1::integer, 10.0::numeric, 20.0::numeric, 4.0::numeric, 'LowerC', 200::numeric, '3/23/2026', '2026-W13', null::text),
      ('Romanian Deadlift', 2::integer, 10.0::numeric, 30.0::numeric, 4.0::numeric, 'LowerC', 300::numeric, '3/23/2026', '2026-W13', null::text),
      ('Romanian Deadlift', 3::integer, 10.0::numeric, 40.0::numeric, 3.0::numeric, 'LowerC', 400::numeric, '3/23/2026', '2026-W13', null::text),
      ('Assisted Pull-ups', 1::integer, 10.0::numeric, 81.25::numeric, 3.0::numeric, 'UpperA', 812.5::numeric, '3/25/2026', '2026-W13', null::text),
      ('Assisted Pull-ups', 2::integer, 10.0::numeric, 75.0::numeric, 2.0::numeric, 'UpperA', 750::numeric, '3/25/2026', '2026-W13', null::text),
      ('Assisted Pull-ups', 3::integer, 10.0::numeric, 75.0::numeric, 1.0::numeric, 'UpperA', 750::numeric, '3/25/2026', '2026-W13', null::text),
      ('Seated Row', 1::integer, 10.0::numeric, 70.0::numeric, 3.0::numeric, 'UpperA', 700::numeric, '3/25/2026', '2026-W13', null::text),
      ('Seated Row', 2::integer, 10.0::numeric, 70.0::numeric, 3.0::numeric, 'UpperA', 700::numeric, '3/25/2026', '2026-W13', null::text),
      ('Seated Row', 3::integer, 10.0::numeric, 75.0::numeric, 2.0::numeric, 'UpperA', 750::numeric, '3/25/2026', '2026-W13', null::text),
      ('Cable Lateral Raise', 1::integer, 10.0::numeric, 7.5::numeric, 3.0::numeric, 'UpperA', 75::numeric, '3/25/2026', '2026-W13', null::text),
      ('Cable Lateral Raise', 2::integer, 10.0::numeric, 7.5::numeric, 3.0::numeric, 'UpperA', 75::numeric, '3/25/2026', '2026-W13', null::text),
      ('Cable Lateral Raise', 3::integer, 10.0::numeric, 7.5::numeric, 3.0::numeric, 'UpperA', 75::numeric, '3/25/2026', '2026-W13', null::text),
      ('Machine Shoulder Press', 1::integer, 10.0::numeric, 30.0::numeric, 4.0::numeric, 'UpperA', 300::numeric, '3/25/2026', '2026-W13', null::text),
      ('Machine Shoulder Press', 2::integer, 10.0::numeric, 35.0::numeric, 2.0::numeric, 'UpperA', 350::numeric, '3/25/2026', '2026-W13', null::text),
      ('Machine Shoulder Press', 3::integer, 10.0::numeric, 35.0::numeric, 1.0::numeric, 'UpperA', 350::numeric, '3/25/2026', '2026-W13', null::text),
      ('Seated Bicep Curl', 1::integer, 10.0::numeric, 30.0::numeric, 4.0::numeric, 'UpperA', 300::numeric, '3/25/2026', '2026-W13', null::text),
      ('Seated Bicep Curl', 2::integer, 10.0::numeric, 40.0::numeric, 2.0::numeric, 'UpperA', 400::numeric, '3/25/2026', '2026-W13', null::text),
      ('Seated Bicep Curl', 3::integer, 10.0::numeric, 40.0::numeric, 0.0::numeric, 'UpperA', 400::numeric, '3/25/2026', '2026-W13', null::text),
      ('Dips', 1::integer, 10.0::numeric, 75.0::numeric, 3.0::numeric, 'UpperB', 750::numeric, '3/27/2026', '2026-W13', null::text),
      ('Dips', 2::integer, 10.0::numeric, 68.75::numeric, 2.0::numeric, 'UpperB', 687.5::numeric, '3/27/2026', '2026-W13', null::text),
      ('Dips', 3::integer, 10.0::numeric, 62.5::numeric, 2.0::numeric, 'UpperB', 625::numeric, '3/27/2026', '2026-W13', null::text),
      ('Chest Fly', 1::integer, 10.0::numeric, 65.0::numeric, 4.0::numeric, 'UpperB', 650::numeric, '3/27/2026', '2026-W13', null::text),
      ('Chest Fly', 2::integer, 10.0::numeric, 70.0::numeric, 3.0::numeric, 'UpperB', 700::numeric, '3/27/2026', '2026-W13', null::text),
      ('Chest Fly', 3::integer, 10.0::numeric, 75.0::numeric, 2.0::numeric, 'UpperB', 750::numeric, '3/27/2026', '2026-W13', null::text),
      ('Rear Delt Fly', 1::integer, 10.0::numeric, 50.0::numeric, 3.0::numeric, 'UpperB', 500::numeric, '3/27/2026', '2026-W13', null::text),
      ('Rear Delt Fly', 2::integer, 10.0::numeric, 50.0::numeric, 3.0::numeric, 'UpperB', 500::numeric, '3/27/2026', '2026-W13', null::text),
      ('Rear Delt Fly', 3::integer, 10.0::numeric, 50.0::numeric, 3.0::numeric, 'UpperB', 500::numeric, '3/27/2026', '2026-W13', null::text),
      ('Leg Press', 1::integer, 10.0::numeric, 180.0::numeric, 5.0::numeric, 'LowerA', 1800::numeric, '4/2/2026', '2026-W14', null::text),
      ('Leg Press', 2::integer, 10.0::numeric, 200.0::numeric, 5.0::numeric, 'LowerA', 2000::numeric, '4/2/2026', '2026-W14', null::text),
      ('Leg Press', 3::integer, 10.0::numeric, 220.0::numeric, 5.0::numeric, 'LowerA', 2200::numeric, '4/2/2026', '2026-W14', null::text),
      ('Seated Calf Raise', 1::integer, 10.0::numeric, 45.0::numeric, 2.0::numeric, 'LowerB', 450::numeric, '4/2/2026', '2026-W14', null::text),
      ('Seated Calf Raise', 2::integer, 10.0::numeric, 45.0::numeric, 2.0::numeric, 'LowerB', 450::numeric, '4/2/2026', '2026-W14', null::text),
      ('Seated Calf Raise', 3::integer, 10.0::numeric, 45.0::numeric, 2.0::numeric, 'LowerB', 450::numeric, '4/2/2026', '2026-W14', null::text),
      ('Assisted Pull-ups', 1::integer, 10.0::numeric, 81.25::numeric, 3.0::numeric, 'UpperA', 812.5::numeric, '5/1/2026', '2026-W18', null::text),
      ('Assisted Pull-ups', 2::integer, 10.0::numeric, 81.25::numeric, 2.0::numeric, 'UpperA', 812.5::numeric, '5/1/2026', '2026-W18', null::text),
      ('Assisted Pull-ups', 3::integer, 10.0::numeric, 100.0::numeric, 3.0::numeric, 'UpperA', 1000::numeric, '5/1/2026', '2026-W18', null::text),
      ('Seated Row', 1::integer, 10.0::numeric, 35.0::numeric, 4.0::numeric, 'UpperA', 350::numeric, '5/1/2026', '2026-W18', null::text),
      ('Seated Row', 2::integer, 10.0::numeric, 35.0::numeric, 4.0::numeric, 'UpperA', 350::numeric, '5/1/2026', '2026-W18', null::text),
      ('Seated Row', 3::integer, 10.0::numeric, 35.0::numeric, 4.0::numeric, 'UpperA', 350::numeric, '5/1/2026', '2026-W18', null::text),
      ('Machine Shoulder Press', 1::integer, 10.0::numeric, 30.0::numeric, 4.0::numeric, 'UpperA', 300::numeric, '5/1/2026', '2026-W18', null::text),
      ('Machine Shoulder Press', 2::integer, 10.0::numeric, 30.0::numeric, 3.0::numeric, 'UpperA', 300::numeric, '5/1/2026', '2026-W18', null::text),
      ('Machine Shoulder Press', 3::integer, 10.0::numeric, 30.0::numeric, 2.0::numeric, 'UpperA', 300::numeric, '5/1/2026', '2026-W18', null::text),
      ('Cable Lateral Raise', 1::integer, 10.0::numeric, 7.5::numeric, 3.0::numeric, 'UpperA', 75::numeric, '5/1/2026', '2026-W18', null::text),
      ('Cable Lateral Raise', 2::integer, 10.0::numeric, 7.5::numeric, 3.0::numeric, 'UpperA', 75::numeric, '5/1/2026', '2026-W18', null::text),
      ('Cable Lateral Raise', 3::integer, 10.0::numeric, 7.5::numeric, 3.0::numeric, 'UpperA', 75::numeric, '5/1/2026', '2026-W18', null::text),
      ('Seated Bicep Curl', 1::integer, 10.0::numeric, 40.0::numeric, 3.0::numeric, 'UpperA', 400::numeric, '5/1/2026', '2026-W18', null::text),
      ('Seated Bicep Curl', 2::integer, 10.0::numeric, 40.0::numeric, 3.0::numeric, 'UpperA', 400::numeric, '5/1/2026', '2026-W18', null::text),
      ('Seated Bicep Curl', 3::integer, 10.0::numeric, 40.0::numeric, 3.0::numeric, 'UpperA', 400::numeric, '5/1/2026', '2026-W18', null::text),
      ('Dips', 1::integer, 10.0::numeric, 75.0::numeric, 2.0::numeric, 'UpperB', 750::numeric, '5/2/2026', '2026-W18', null::text),
      ('Dips', 2::integer, 10.0::numeric, 85.0::numeric, 3.0::numeric, 'UpperB', 850::numeric, '5/2/2026', '2026-W18', null::text),
      ('Dips', 3::integer, 10.0::numeric, 85.0::numeric, 3.0::numeric, 'UpperB', 850::numeric, '5/2/2026', '2026-W18', null::text),
      ('Pushups', 1::integer, 10.0::numeric, null::numeric, 2.0::numeric, 'UpperB', null::numeric, '5/2/2026', '2026-W18', null::text),
      ('Pushups', 2::integer, 10.0::numeric, null::numeric, 2.0::numeric, 'UpperB', null::numeric, '5/2/2026', '2026-W18', null::text),
      ('Pushups', 3::integer, 10.0::numeric, null::numeric, 2.0::numeric, 'UpperB', null::numeric, '5/2/2026', '2026-W18', null::text),
      ('Chest Fly', 1::integer, 10.0::numeric, 60.0::numeric, 3.0::numeric, 'UpperB', 600::numeric, '5/2/2026', '2026-W18', null::text),
      ('Chest Fly', 2::integer, 10.0::numeric, 60.0::numeric, 3.0::numeric, 'UpperB', 600::numeric, '5/2/2026', '2026-W18', null::text),
      ('Chest Fly', 3::integer, 10.0::numeric, 60.0::numeric, 2.0::numeric, 'UpperB', 600::numeric, '5/2/2026', '2026-W18', null::text),
      ('Rear Delt Fly', 1::integer, 10.0::numeric, 50.0::numeric, 2.0::numeric, 'UpperB', 500::numeric, '5/2/2026', '2026-W18', null::text),
      ('Rear Delt Fly', 2::integer, 10.0::numeric, 45.0::numeric, 3.0::numeric, 'UpperB', 450::numeric, '5/2/2026', '2026-W18', null::text),
      ('Rear Delt Fly', 3::integer, 10.0::numeric, 45.0::numeric, 2.0::numeric, 'UpperB', 450::numeric, '5/2/2026', '2026-W18', null::text),
      ('Leg Press', 1::integer, 10.0::numeric, 90.0::numeric, 4.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Leg Press', 2::integer, 10.0::numeric, 90.0::numeric, 4.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Leg Press', 3::integer, 10.0::numeric, 90.0::numeric, 4.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Leg Extension', 1::integer, 10.0::numeric, 55.0::numeric, 3.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Leg Extension', 2::integer, 10.0::numeric, 55.0::numeric, 3.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Leg Extension', 3::integer, 10.0::numeric, 55.0::numeric, 3.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Machine Ab Crunch', 1::integer, 10.0::numeric, 10.0::numeric, 3.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Machine Ab Crunch', 2::integer, 10.0::numeric, 10.0::numeric, 3.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Machine Ab Crunch', 3::integer, 10.0::numeric, 10.0::numeric, 3.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Hip Thrust', 1::integer, 10.0::numeric, 5.0::numeric, 4.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Hip Thrust', 2::integer, 10.0::numeric, 5.0::numeric, 4.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Hip Thrust', 3::integer, 10.0::numeric, 5.0::numeric, 4.0::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Plank', 1::integer, 10.0::numeric, null::numeric, null::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Plank', 2::integer, 10.0::numeric, null::numeric, null::numeric, 'LowerA', null::numeric, '5/4/2026', '2026-W19', null::text),
      ('Standing Calf Raise', 1::integer, 10.0::numeric, 15.0::numeric, 5.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Standing Calf Raise', 2::integer, 10.0::numeric, 15.0::numeric, 4.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Standing Calf Raise', 3::integer, 10.0::numeric, 15.0::numeric, 3.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Leg Curl', 1::integer, 10.0::numeric, 55.0::numeric, 5.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Leg Curl', 2::integer, 10.0::numeric, 70.0::numeric, 4.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Leg Curl', 3::integer, 10.0::numeric, 85.0::numeric, 4.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Adductor Machine', 1::integer, 10.0::numeric, 65.0::numeric, 4.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Adductor Machine', 2::integer, 10.0::numeric, 70.0::numeric, 4.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Adductor Machine', 3::integer, 10.0::numeric, 85.0::numeric, 4.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Abductor Machine', 1::integer, 10.0::numeric, 55.0::numeric, 3.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Abductor Machine', 2::integer, 10.0::numeric, 70.0::numeric, 3.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Abductor Machine', 3::integer, 10.0::numeric, 80.0::numeric, 3.0::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Leg Raises', 1::integer, 10.0::numeric, null::numeric, null::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Leg Raises', 2::integer, 10.0::numeric, null::numeric, null::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text),
      ('Leg Raises', 3::integer, 10.0::numeric, null::numeric, null::numeric, 'LowerB', null::numeric, '5/6/2026', '2026-W19', null::text)
  ) as v(exercise_name, set_number, reps, weight, rir, split_key, volume, date_text, week, note)
),
normalized_rows as (
  select
    exercise_name,
    set_number,
    reps,
    weight,
    rir,
    case split_key
      when 'UpperA' then 'Upper A'
      when 'UpperB' then 'Upper B'
      when 'LowerA' then 'Lower A'
      when 'LowerB' then 'Lower B'
      when 'LowerC' then 'Lower C'
      else split_key
    end as split,
    volume,
    to_date(date_text, 'MM/DD/YYYY') as workout_date,
    week,
    note
  from raw_rows
),
insert_workouts as (
  insert into public.workouts (date, week, split, status)
  select distinct workout_date, week, split, 'completed'
  from normalized_rows nr
  where not exists (
    select 1
    from public.workouts w
    where w.date = nr.workout_date
      and w.split = nr.split
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
  volume,
  note
)
select
  w.id as workout_id,
  e.id as exercise_id,
  nr.set_number,
  nr.reps,
  nr.weight,
  nr.rir,
  case when e.tracking_type = 'timed' then nr.reps else null end as duration_seconds,
  coalesce(
    nr.volume,
    case when nr.reps is not null and nr.weight is not null then nr.reps * nr.weight else null end
  ) as volume,
  nr.note
from normalized_rows nr
join public.workouts w
  on w.date = nr.workout_date
 and w.split = nr.split
 and w.status = 'completed'
join public.exercises e
  on e.name = nr.exercise_name
 and e.split = nr.split
on conflict (workout_id, exercise_id, set_number)
do update set
  reps = excluded.reps,
  weight = excluded.weight,
  rir = excluded.rir,
  duration_seconds = excluded.duration_seconds,
  volume = excluded.volume,
  note = excluded.note;
