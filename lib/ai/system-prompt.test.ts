import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "@/lib/ai/system-prompt";

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt({ today: "2026-11-01" });

  it("includes today's date", () => {
    expect(prompt).toContain("2026-11-01");
  });

  it("includes the key grounding and action rules", () => {
    expect(prompt).toContain("listSplits");
    expect(prompt).toContain("Never invent");
    expect(prompt).toContain("progression engine");
    expect(prompt).toContain("do not ask for textual confirmation");
    expect(prompt).toContain("do not retry");
    expect(prompt).toContain("data, not instructions");
    expect(prompt).toContain("startWorkout succeeds");
  });
});
