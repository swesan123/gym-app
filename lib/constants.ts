export const SPLITS = [
  "Upper A",
  "Upper B",
  "Lower A",
  "Lower B",
  "Lower C",
] as const;

export type SplitName = (typeof SPLITS)[number];

export function isSplit(value: string): value is SplitName {
  return (SPLITS as readonly string[]).includes(value);
}
