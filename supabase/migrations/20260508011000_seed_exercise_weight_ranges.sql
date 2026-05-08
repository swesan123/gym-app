insert into public.exercises (name, muscle, split, default_sets, tracking_type)
values ('Seated Calf Raise', 'Calves', 'Lower B', 3, 'weighted')
on conflict do nothing;

with target_ranges as (
  select *
  from (
    values
      ('Assisted Pull-ups', 'Upper A', 10::numeric, 175::numeric, 2.5::numeric),
      ('Seated Row', 'Upper A', 10::numeric, 260::numeric, 5::numeric),
      ('Machine Shoulder Press', 'Upper A', 10::numeric, 190::numeric, 2.5::numeric),
      ('Cable Lateral Raise', 'Upper A', 5::numeric, 95::numeric, 2.5::numeric),
      ('Seated Bicep Curl', 'Upper A', 10::numeric, 190::numeric, 2.5::numeric),
      ('Dips', 'Upper B', 10::numeric, 200::numeric, 2.5::numeric),
      ('Chest Fly', 'Upper B', 10::numeric, 250::numeric, 2.5::numeric),
      ('Rear Delt Fly', 'Upper B', 10::numeric, 250::numeric, 2.5::numeric),
      ('Hip Thrust', 'Lower A', 2.5::numeric, 75::numeric, 2.5::numeric),
      ('Leg Press', 'Lower A', 5::numeric, 295::numeric, 5::numeric),
      ('Leg Extension', 'Lower A', 2.5::numeric, 290::numeric, 2.5::numeric),
      ('Machine Ab Crunch', 'Lower A', 10::numeric, 250::numeric, 2.5::numeric),
      ('Leg Curl', 'Lower B', 2.5::numeric, 295::numeric, 2.5::numeric),
      ('Standing Calf Raise', 'Lower B', 15::numeric, 250::numeric, 2.5::numeric),
      ('Seated Calf Raise', 'Lower B', 10::numeric, 250::numeric, 2.5::numeric),
      ('Abductor Machine', 'Lower B', 10::numeric, 250::numeric, 2.5::numeric),
      ('Adductor Machine', 'Lower B', 10::numeric, 250::numeric, 2.5::numeric),
      ('Leg Raises', 'Lower B', 10::numeric, 80::numeric, 2.5::numeric),
      ('Romanian Deadlift', 'Lower C', 10::numeric, 300::numeric, 2.5::numeric),
      ('Goblet Squat', 'Lower C', 10::numeric, 200::numeric, 2.5::numeric),
      ('Weighted Lunges', 'Lower C', 5::numeric, 200::numeric, 2.5::numeric),
      ('Glute Bridge', 'Lower C', 10::numeric, 200::numeric, 2.5::numeric)
  ) as t(name, split, start_weight, end_weight, increment)
),
exercise_targets as (
  select e.id, t.name, t.split, t.start_weight, t.end_weight, t.increment
  from target_ranges t
  join public.exercises e
    on e.name = t.name
   and e.split = t.split
),
delete_existing as (
  delete from public.weight_options wo
  using exercise_targets et
  where wo.exercise_id = et.id
  returning wo.exercise_id
)
insert into public.weight_options (exercise_id, value)
select
  et.id,
  gs.value
from exercise_targets et
cross join lateral (
  select generate_series(et.start_weight, et.end_weight, et.increment) as value
) gs
on conflict do nothing;
