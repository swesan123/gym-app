-- Per-exercise duration presets for timed/stretch exercises, mirroring the
-- machine weight start/end/increment pattern so hold/rep times can be tuned
-- per exercise instead of relying on the fixed global DURATION_PRESETS (#90).
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS duration_start_seconds numeric,
ADD COLUMN IF NOT EXISTS duration_end_seconds numeric,
ADD COLUMN IF NOT EXISTS duration_step_seconds numeric;
