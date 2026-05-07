-- Seed default exercises (split / tracking per MVP spec)
insert into public.exercises (name, muscle, workout_type, split, default_sets, tracking_type) values
('Assisted Pull-ups', 'Back', 'Upper', 'Upper A', 3, 'assisted'),
('Seated Row', 'Back', 'Upper', 'Upper A', 3, 'weighted'),
('Machine Shoulder Press', 'Shoulders', 'Upper', 'Upper A', 3, 'weighted'),
('Cable Lateral Raise', 'Shoulders', 'Upper', 'Upper A', 3, 'weighted'),
('Seated Bicep Curl', 'Biceps', 'Upper', 'Upper A', 3, 'weighted'),
('Dips', 'Chest', 'Upper', 'Upper B', 3, 'assisted'),
('Pushups', 'Chest', 'Upper', 'Upper B', 3, 'bodyweight'),
('Chest Fly', 'Chest', 'Upper', 'Upper B', 3, 'weighted'),
('Rear Delt Fly', 'Rear Delts', 'Upper', 'Upper B', 3, 'weighted'),
('Hip Thrust', 'Glutes', 'Lower', 'Lower A', 3, 'weighted'),
('Leg Press', 'Quads', 'Lower', 'Lower A', 3, 'weighted'),
('Leg Extension', 'Quads', 'Lower', 'Lower A', 3, 'weighted'),
('Machine Ab Crunch', 'Abs', 'Lower', 'Lower A', 3, 'weighted'),
('Plank', 'Abs', 'Lower', 'Lower A', 2, 'timed'),
('Leg Curl', 'Hamstrings', 'Lower', 'Lower B', 3, 'weighted'),
('Standing Calf Raise', 'Calves', 'Lower', 'Lower B', 3, 'weighted'),
('Abductor Machine', 'Glutes', 'Lower', 'Lower B', 3, 'weighted'),
('Adductor Machine', 'Adductors', 'Lower', 'Lower B', 3, 'weighted'),
('Leg Raises', 'Abs', 'Lower', 'Lower B', 3, 'bodyweight'),
('Romanian Deadlift', 'Hamstrings', 'Lower', 'Lower C', 3, 'weighted'),
('Goblet Squat', 'Quads', 'Lower', 'Lower C', 3, 'weighted'),
('Weighted Lunges', 'Quads', 'Lower', 'Lower C', 3, 'weighted'),
('Glute Bridge', 'Glutes', 'Lower', 'Lower C', 3, 'weighted');

-- Global weight presets: 2.5 .. 200 step 2.5
insert into public.weight_options (exercise_id, value)
select null, g
from generate_series(2.5::numeric, 200::numeric, 2.5::numeric) as g;
