import { z } from "zod";

/**
 * Shared contract for the AI chat tools: names, input schemas, and output shapes.
 * READ tools run automatically; WRITE tools require user approval (see WRITE_TOOL_NAMES).
 */

export const trackingTypeSchema = z.enum(["weighted", "assisted", "bodyweight", "timed"]);
export const stretchKindSchema = z.enum(["none", "dynamic", "static"]);

// ---------- Inputs ----------

export const listSplitsInput = z.object({});

export const listExercisesInput = z.object({
  split: z.string().min(1).optional().describe("Only exercises assigned to this split name"),
  query: z.string().min(1).optional().describe("Case-insensitive substring match on exercise name or muscle"),
});

export const getRecentWorkoutsInput = z.object({
  limit: z.number().int().min(1).max(30).default(5).describe("How many recent workouts to return"),
});

export const getExerciseProgressInput = z.object({
  exercise: z.string().min(1).describe("Exact exercise name from listExercises"),
  weeks: z.number().int().min(1).max(52).default(8).describe("How many recent weeks to include"),
});

export const getPersonalRecordsInput = z.object({
  exercise: z
    .string()
    .min(1)
    .optional()
    .describe("Exact exercise name; omit to get records for every exercise"),
});

export const getTrainingProfileInput = z.object({});

export const getActiveDraftInput = z.object({});

export const createExerciseInput = z.object({
  name: z.string().trim().min(1).max(80),
  muscle: z.string().trim().min(1).max(40).describe("Primary muscle group, e.g. Chest, Back, Quads"),
  splits: z
    .array(z.string().min(1))
    .min(1)
    .describe("Existing split names from listSplits to assign the exercise to"),
  tracking_type: trackingTypeSchema.default("weighted"),
  default_sets: z.number().int().min(1).max(10).default(3),
  default_reps: z
    .number()
    .int()
    .min(1)
    .max(600)
    .nullable()
    .default(null)
    .describe("Target reps (or seconds for timed exercises)"),
  rest_seconds: z.number().int().min(0).max(900).nullable().default(null),
  notes: z.string().max(500).nullable().default(null),
});

export const startWorkoutInput = z.object({
  split: z.string().min(1).describe("Existing split name from listSplits"),
});

export type CreateExerciseInput = z.infer<typeof createExerciseInput>;
export type StartWorkoutInput = z.infer<typeof startWorkoutInput>;

// ---------- Outputs ----------

export type ToolError = { error: string };

export type ListSplitsOutput = { splits: string[] };

export type ExerciseSummary = {
  id: string;
  name: string;
  muscle: string;
  trackingType: z.infer<typeof trackingTypeSchema>;
  splits: string[];
};
export type ListExercisesOutput = { exercises: ExerciseSummary[] };

export type RecentWorkout = {
  id: string;
  date: string;
  split: string;
  status: "draft" | "completed";
  completedAt: string | null;
  workingSetsDone: number;
  totalVolume: number | null;
  url: string;
};
export type GetRecentWorkoutsOutput = { workouts: RecentWorkout[] };

export type ExerciseProgressWeek = {
  week: string;
  bestWeight: number | null;
  bestReps: number | null;
  bestRir: number | null;
  bestVolume: number | null;
  maxAdjustedVolume: number | null;
  bestE1rm: number | null;
};
export type GetExerciseProgressOutput =
  | { exercise: string; trackingType: ExerciseSummary["trackingType"]; weeks: ExerciseProgressWeek[] }
  | ToolError;

export type RecordEntry = { value: number; weight: number | null; reps: number | null; date: string };
export type PersonalRecord = {
  exercise: string;
  trackingType: ExerciseSummary["trackingType"];
  heaviestWeight: RecordEntry | null;
  bestE1rm: RecordEntry | null;
  mostReps: RecordEntry | null;
  bestSetVolume: RecordEntry | null;
};
export type GetPersonalRecordsOutput = { records: PersonalRecord[] } | ToolError;

export type GetTrainingProfileOutput = { bodyWeight: number | null };

export type ActiveDraft = {
  workoutId: string;
  split: string;
  date: string;
  workingSetsDone: number;
  workingSetsTotal: number;
  url: string;
};
export type GetActiveDraftOutput = { draft: ActiveDraft | null };

export type CreateExerciseOutput = { exerciseId: string; name: string; splits: string[] } | ToolError;

export type StartWorkoutOutput = { workoutId: string; split: string; url: string } | ToolError;

// ---------- Names ----------

export const READ_TOOL_NAMES = [
  "listSplits",
  "listExercises",
  "getRecentWorkouts",
  "getExerciseProgress",
  "getPersonalRecords",
  "getTrainingProfile",
  "getActiveDraft",
] as const;

export const WRITE_TOOL_NAMES = ["createExercise", "startWorkout"] as const;

export type ReadToolName = (typeof READ_TOOL_NAMES)[number];
export type WriteToolName = (typeof WRITE_TOOL_NAMES)[number];
export type ChatToolName = ReadToolName | WriteToolName;

export const workoutUrl = (workoutId: string) => `/workout/${workoutId}`;
