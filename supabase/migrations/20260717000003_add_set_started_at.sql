-- Per-set start time so elapsed time per working set can be shown in history (#95).
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
