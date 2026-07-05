-- Explicit "Done" tracking for workout sets (#73).
-- A set is only counted as finished once the user taps Done, not merely
-- because its fields are filled in — this catches forgotten RIR before
-- the workout is finished.
ALTER TABLE workout_sets
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
