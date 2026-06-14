-- Remove percentage-based progressive overload in favor of fixed increments only
ALTER TABLE exercises DROP COLUMN progressive_overload_pct;
