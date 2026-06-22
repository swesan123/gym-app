-- Add set_type column to workout_sets (Warmup vs. Working distinction)
ALTER TABLE workout_sets
ADD COLUMN set_type TEXT DEFAULT 'working' CHECK (set_type IN ('warmup', 'working'));

-- Add archive columns to allow soft-delete without destroying history
ALTER TABLE workout_splits
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE exercises
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes for efficient filtering of active (non-archived) items
CREATE INDEX idx_workout_splits_archived ON workout_splits(archived_at);
CREATE INDEX idx_exercises_archived ON exercises(archived_at);
