-- Return-from-break load adjustments (issue #99). Per-exercise metadata written when a draft is
-- created after a training break; the next draft reads it to continue the ramp back to the
-- pre-break weight. Shape: lib/loadAdjustment.ts (LoadAdjustments). Null means no adjustment.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS load_adjustments jsonb;
