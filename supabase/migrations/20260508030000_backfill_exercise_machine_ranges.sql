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
)
update public.exercises e
set
  machine_start_weight = tr.start_weight,
  machine_end_weight = tr.end_weight,
  machine_increment = tr.increment
from target_ranges tr
where e.name = tr.name
  and e.split = tr.split;
