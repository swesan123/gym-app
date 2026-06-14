-- Add fixed increment column for progressive overload
ALTER TABLE exercises ADD COLUMN progressive_overload_increment numeric;

-- Comment explaining the new column
COMMENT ON COLUMN exercises.progressive_overload_increment IS 'Fixed absolute weight increment (e.g., 2.5 for bench press, 10 for leg press). If set, used instead of percentage-based progressive_overload_pct.';
