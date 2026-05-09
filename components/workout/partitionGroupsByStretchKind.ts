import type { StretchKind } from "@/lib/database.types";

import type { SummaryExercise } from "@/components/workout/WorkoutSummary";

export type StretchSectionKey = "dynamic" | "main" | "static";

export type StretchSectionBucket = {
  key: StretchSectionKey;
  title: string;
  groups: SummaryExercise[];
};

/** Order: dynamic stretches → main → static stretches; omit empty buckets in UI. */
export function partitionGroupsByStretchKind(
  groups: SummaryExercise[],
): StretchSectionBucket[] {
  const defs: {
    key: StretchSectionKey;
    kinds: StretchKind[];
    title: string;
  }[] = [
    {
      key: "dynamic",
      kinds: ["dynamic"],
      title: "Dynamic stretches",
    },
    { key: "main", kinds: ["none"], title: "Main exercises" },
    {
      key: "static",
      kinds: ["static"],
      title: "Static stretches",
    },
  ];

  return defs.map((d) => ({
    key: d.key,
    title: d.title,
    groups: groups.filter((g) =>
      d.kinds.includes(normalizeStretch(g.stretch_kind)),
    ),
  }));
}

function normalizeStretch(k: StretchKind | undefined): StretchKind {
  if (k === "dynamic" || k === "static") return k;
  return "none";
}
