-- Create junction table for exercises belonging to multiple splits
CREATE TABLE public.exercise_splits (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  split_name  text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (exercise_id, split_name)
);

-- Backfill from existing single-split column
INSERT INTO exercise_splits (exercise_id, split_name, sort_order)
SELECT id, split, sort_order FROM exercises;

-- Make split nullable to signal migration to junction table
ALTER TABLE exercises ALTER COLUMN split DROP NOT NULL;

COMMENT ON TABLE exercise_splits IS 'Junction table allowing exercises to belong to multiple splits.';
COMMENT ON COLUMN exercise_splits.sort_order IS 'Per-exercise-per-split sort order, allowing different positions in different splits.';
