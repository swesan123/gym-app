-- Default splits (safe if migration already inserted them)
insert into public.workout_splits (name, sort_order) values
('Upper A', 1), ('Upper B', 2), ('Lower A', 3), ('Lower B', 4), ('Lower C', 5), ('Unassigned', 999999)
on conflict (name) do nothing;

-- Seed default exercises (split encodes upper/lower layout; no separate workout_type)
insert into public.exercises (name, muscle, split, default_sets, tracking_type) values
('Assisted Pull-ups', 'Back', 'Upper A', 3, 'assisted'),
('Seated Row', 'Back', 'Upper A', 3, 'weighted'),
('Machine Shoulder Press', 'Shoulders', 'Upper A', 3, 'weighted'),
('Cable Lateral Raise', 'Shoulders', 'Upper A', 3, 'weighted'),
('Seated Bicep Curl', 'Biceps', 'Upper A', 3, 'weighted'),
('Dips', 'Chest', 'Upper B', 3, 'assisted'),
('Pushups', 'Chest', 'Upper B', 3, 'bodyweight'),
('Chest Fly', 'Chest', 'Upper B', 3, 'weighted'),
('Rear Delt Fly', 'Rear Delts', 'Upper B', 3, 'weighted'),
('Hip Thrust', 'Glutes', 'Lower A', 3, 'weighted'),
('Leg Press', 'Quads', 'Lower A', 3, 'weighted'),
('Leg Extension', 'Quads', 'Lower A', 3, 'weighted'),
('Machine Ab Crunch', 'Abs', 'Lower A', 3, 'weighted'),
('Plank', 'Abs', 'Lower A', 2, 'timed'),
('Leg Curl', 'Hamstrings', 'Lower B', 3, 'weighted'),
('Standing Calf Raise', 'Calves', 'Lower B', 3, 'weighted'),
('Abductor Machine', 'Glutes', 'Lower B', 3, 'weighted'),
('Adductor Machine', 'Adductors', 'Lower B', 3, 'weighted'),
('Leg Raises', 'Abs', 'Lower B', 3, 'bodyweight'),
('Romanian Deadlift', 'Hamstrings', 'Lower C', 3, 'weighted'),
('Goblet Squat', 'Quads', 'Lower C', 3, 'weighted'),
('Weighted Lunges', 'Quads', 'Lower C', 3, 'weighted'),
('Glute Bridge', 'Glutes', 'Lower C', 3, 'weighted');

-- Global weight presets: 2.5 .. 200 step 2.5 (safe if seed runs again)
insert into public.weight_options (exercise_id, value)
select null, g
from generate_series(2.5::numeric, 200::numeric, 2.5::numeric) as g
on conflict (value) where exercise_id is null do nothing;
