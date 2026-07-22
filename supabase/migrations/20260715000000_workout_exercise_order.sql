-- Per-workout exercise ordering so "Skip" (#93) can reorder an exercise for
-- the current session only, without touching the split's default order in
-- exercise_splits.
CREATE TABLE IF NOT EXISTS public.workout_exercise_order (
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sort_order integer NOT NULL,
  PRIMARY KEY (workout_id, exercise_id)
);

COMMENT ON TABLE public.workout_exercise_order IS 'Per-workout override of exercise sort order, seeded from exercise_splits at draft creation and reshuffled by Skip.';

ALTER TABLE public.workout_exercise_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_exercise_order_select_public"
  ON public.workout_exercise_order FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.workout_exercise_order TO anon, authenticated;
