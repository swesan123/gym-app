-- Remove duplicate global weight presets (e.g. after seed.sql ran multiple times)
DELETE FROM public.weight_options wo
WHERE wo.ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      ROW_NUMBER() OVER (
        PARTITION BY value
        ORDER BY created_at
      ) AS rn
    FROM public.weight_options
    WHERE exercise_id IS NULL
  ) ranked
  WHERE rn > 1
);

-- Prevent duplicate global values going forward
CREATE UNIQUE INDEX IF NOT EXISTS weight_options_global_value_unique
ON public.weight_options (value)
WHERE exercise_id IS NULL;
