/** Max elapsed time shown for a completed workout (e.g. left session open). */
export const WORKOUT_DISPLAY_DURATION_CAP_SEC = 2 * 3600;

export function clampWorkoutElapsedSeconds(
  totalSeconds: number | null,
): number | null {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return null;
  return Math.min(Math.max(0, totalSeconds), WORKOUT_DISPLAY_DURATION_CAP_SEC);
}

export function formatDurationSeconds(totalSeconds: number | null): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "—";
  }

  const secs = Math.round(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
