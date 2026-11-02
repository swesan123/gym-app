import type { InferUITools } from "ai";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  READ_TOOL_NAMES,
  WRITE_TOOL_NAMES,
  createExerciseInput,
  getExerciseProgressInput,
  getRecentWorkoutsInput,
} from "@/lib/ai/contracts";
import type { ChatUITools } from "@/lib/ai/message";
import { chatTools, WRITE_TOOL_APPROVAL } from "@/lib/ai/tools";
import { createExerciseCore } from "@/lib/core/exercises";
import { createWorkoutDraft, previewReturnPlan } from "@/lib/core/workouts";
import type { LoadAdjustments } from "@/lib/loadAdjustment";
import { getExerciseProgress, getRecentWorkouts, listSplitsForChat } from "@/lib/queries/stats";

vi.mock("@/lib/queries/stats", () => ({
  listSplitsForChat: vi.fn(),
  listExercisesForChat: vi.fn(),
  getRecentWorkouts: vi.fn(),
  getExerciseProgress: vi.fn(),
  getPersonalRecords: vi.fn(),
  getTrainingProfileForChat: vi.fn(),
  getActiveDraft: vi.fn(),
}));
vi.mock("@/lib/core/exercises", () => ({ createExerciseCore: vi.fn() }));
vi.mock("@/lib/core/workouts", () => ({ createWorkoutDraft: vi.fn(), previewReturnPlan: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const options = { toolCallId: "call-1", messages: [] };

type ExecuteOptions = Parameters<NonNullable<typeof chatTools.listSplits.execute>>[1];
const execOptions = options as unknown as ExecuteOptions;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("chatTools", () => {
  it("exposes exactly the READ and WRITE tool names", () => {
    expect(Object.keys(chatTools).sort()).toEqual(
      [...READ_TOOL_NAMES, ...WRITE_TOOL_NAMES].sort(),
    );
  });

  it("is type-compatible with ChatUITools", () => {
    expectTypeOf<InferUITools<typeof chatTools>>().toExtend<ChatUITools>();
  });

  it("delegates read tools to the stats queries", async () => {
    vi.mocked(listSplitsForChat).mockResolvedValue({ splits: ["Push"] });
    vi.mocked(getRecentWorkouts).mockResolvedValue({ workouts: [] });
    vi.mocked(getExerciseProgress).mockResolvedValue({ error: "nope" });

    await expect(chatTools.listSplits.execute!({}, execOptions)).resolves.toEqual({
      splits: ["Push"],
    });

    const recentInput = getRecentWorkoutsInput.parse({});
    await chatTools.getRecentWorkouts.execute!(recentInput, execOptions);
    expect(getRecentWorkouts).toHaveBeenCalledWith({ limit: 5 });

    const progressInput = getExerciseProgressInput.parse({ exercise: "Bench Press" });
    await expect(chatTools.getExerciseProgress.execute!(progressInput, execOptions)).resolves.toEqual({
      error: "nope",
    });
    expect(getExerciseProgress).toHaveBeenCalledWith({ exercise: "Bench Press", weeks: 8 });
  });
});

describe("createExercise", () => {
  it("fills form defaults and returns the created exercise", async () => {
    vi.mocked(createExerciseCore).mockResolvedValue({ id: "ex-1", syncedDraftIds: [] });
    const input = createExerciseInput.parse({
      name: "Cable Fly",
      muscle: "Chest",
      splits: ["Push"],
    });

    const output = await chatTools.createExercise.execute!(input, execOptions);

    expect(createExerciseCore).toHaveBeenCalledWith({
      name: "Cable Fly",
      muscle: "Chest",
      splits: ["Push"],
      default_sets: 3,
      tracking_type: "weighted",
      notes: null,
      machine_start_weight: null,
      machine_end_weight: null,
      machine_increment: null,
      default_reps: null,
      progressive_overload_increment: null,
      rest_seconds: null,
      stretch_kind: "none",
      duration_start_seconds: null,
      duration_end_seconds: null,
      duration_step_seconds: null,
    });
    expect(output).toEqual({ exerciseId: "ex-1", name: "Cable Fly", splits: ["Push"] });
  });

  it("returns a ToolError instead of throwing", async () => {
    vi.mocked(createExerciseCore).mockRejectedValue(new Error("Unknown split: Legs"));
    const input = createExerciseInput.parse({ name: "Squat", muscle: "Quads", splits: ["Legs"] });

    await expect(chatTools.createExercise.execute!(input, execOptions)).resolves.toEqual({
      error: "Unknown split: Legs",
    });
  });
});

describe("startWorkout", () => {
  const firstSessionAdjustments: LoadAdjustments = {
    "ex-1": {
      phase: "first-session",
      gapDays: 49,
      cutPct: 15,
      holdProgression: true,
      dropOneSet: true,
      targetRir: 3,
      referenceWeights: { "1": 100 },
      overridden: false,
    },
  };

  it("returns the workout id and url with no adjustment when none applies", async () => {
    vi.mocked(createWorkoutDraft).mockResolvedValue({ id: "w-1", loadAdjustments: {} });

    await expect(chatTools.startWorkout.execute!({ split: "Push" }, execOptions)).resolves.toEqual({
      workoutId: "w-1",
      split: "Push",
      url: "/workout/w-1",
      adjustment: null,
    });
    expect(createWorkoutDraft).toHaveBeenCalledWith("Push", { loadAdjustmentPercent: undefined });
  });

  it("passes loadAdjustmentPercent through to the draft", async () => {
    vi.mocked(createWorkoutDraft).mockResolvedValue({ id: "w-1", loadAdjustments: {} });

    await chatTools.startWorkout.execute!({ split: "Push", loadAdjustmentPercent: 15 }, execOptions);

    expect(createWorkoutDraft).toHaveBeenCalledWith("Push", { loadAdjustmentPercent: 15 });
  });

  it("includes a summary of the applied load adjustments", async () => {
    vi.mocked(createWorkoutDraft).mockResolvedValue({
      id: "w-2",
      loadAdjustments: firstSessionAdjustments,
    });

    await expect(chatTools.startWorkout.execute!({ split: "Push" }, execOptions)).resolves.toEqual({
      workoutId: "w-2",
      split: "Push",
      url: "/workout/w-2",
      adjustment: {
        exercisesAdjusted: 1,
        maxGapDays: 49,
        awayDays: 49,
        minCutPct: 15,
        maxCutPct: 15,
        firstSessionBack: true,
        droppedSets: true,
        targetRir: 3,
        overridden: false,
      },
    });
  });

  it("returns a ToolError when the draft cannot be created", async () => {
    vi.mocked(createWorkoutDraft).mockRejectedValue(new Error("Unknown split"));

    await expect(chatTools.startWorkout.execute!({ split: "Nope" }, execOptions)).resolves.toEqual({
      error: "Unknown split",
    });
  });
});

describe("getReturnPlan", () => {
  it("delegates to previewReturnPlan", async () => {
    const plan = { split: "Push", daysSinceLastWorkout: 49, exercises: [], summary: null };
    vi.mocked(previewReturnPlan).mockResolvedValue(plan);

    await expect(chatTools.getReturnPlan.execute!({ split: "Push" }, execOptions)).resolves.toEqual(plan);
    expect(previewReturnPlan).toHaveBeenCalledWith("Push");
  });

  it("returns a ToolError instead of throwing", async () => {
    vi.mocked(previewReturnPlan).mockRejectedValue(new Error("Unknown split"));

    await expect(chatTools.getReturnPlan.execute!({ split: "Nope" }, execOptions)).resolves.toEqual({
      error: "Unknown split",
    });
  });
});

describe("WRITE_TOOL_APPROVAL", () => {
  it("requires user approval for exactly the WRITE tools", () => {
    expect(Object.keys(WRITE_TOOL_APPROVAL).sort()).toEqual([...WRITE_TOOL_NAMES].sort());
    for (const name of WRITE_TOOL_NAMES) {
      expect(WRITE_TOOL_APPROVAL[name]).toBe("user-approval");
    }
    for (const name of READ_TOOL_NAMES) {
      expect(Object.keys(WRITE_TOOL_APPROVAL)).not.toContain(name);
    }
  });
});
