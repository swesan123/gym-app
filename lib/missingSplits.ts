/** Completed split names per week key (e.g. `2026-W28`), used to spot gaps in a rotation. */
export type WeeklySplitCounts = Map<string, Set<string>>;

/**
 * A split counts as "core" for gap detection once it shows up in at least
 * half of the given recent weeks. This adapts to whatever rotation the user
 * actually runs instead of hardcoding names like Push/Pull/Legs, so one-off
 * splits don't get flagged as "missing" every week that follows.
 */
export function computeCoreSplits(
  weeklyCompletedSplits: WeeklySplitCounts,
  recentWeekKeys: string[],
): string[] {
  if (recentWeekKeys.length < 3) return [];

  const countBySplit = new Map<string, number>();
  for (const weekKey of recentWeekKeys) {
    const splits = weeklyCompletedSplits.get(weekKey);
    if (!splits) continue;
    for (const split of splits) {
      countBySplit.set(split, (countBySplit.get(split) ?? 0) + 1);
    }
  }

  const threshold = Math.ceil(recentWeekKeys.length / 2);
  return [...countBySplit.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([split]) => split)
    .sort();
}

/** Core splits with no completed workout in the given week. */
export function missingSplitsForWeek(
  weeklyCompletedSplits: WeeklySplitCounts,
  weekKey: string,
  coreSplits: string[],
): string[] {
  const done = weeklyCompletedSplits.get(weekKey) ?? new Set<string>();
  return coreSplits.filter((split) => !done.has(split));
}
