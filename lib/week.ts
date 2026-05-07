import { getISOWeek, getISOWeekYear } from "date-fns";

/** ISO week label e.g. `2026-W19` */
export function formatWorkoutWeek(d: Date): string {
  const year = getISOWeekYear(d);
  const week = getISOWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
