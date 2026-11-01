import { tool } from "ai";
import { revalidatePath } from "next/cache";

import {
  createExerciseInput,
  getActiveDraftInput,
  getExerciseProgressInput,
  getPersonalRecordsInput,
  getRecentWorkoutsInput,
  getTrainingProfileInput,
  listExercisesInput,
  listSplitsInput,
  startWorkoutInput,
  workoutUrl,
  type CreateExerciseOutput,
  type StartWorkoutOutput,
  type WriteToolName,
} from "@/lib/ai/contracts";
import { createExerciseCore } from "@/lib/core/exercises";
import { createWorkoutDraft } from "@/lib/core/workouts";
import {
  getActiveDraft,
  getExerciseProgress,
  getPersonalRecords,
  getRecentWorkouts,
  getTrainingProfileForChat,
  listExercisesForChat,
  listSplitsForChat,
} from "@/lib/queries/stats";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unexpected error";

const NAMES_HINT = "Use exact names returned by listSplits / listExercises.";

export const chatTools = {
  listSplits: tool({
    description:
      "List the user's workout split names. Call this first whenever a split name is needed (createExercise, startWorkout, filtering exercises).",
    inputSchema: listSplitsInput,
    execute: () => listSplitsForChat(),
  }),
  listExercises: tool({
    description: `List the user's exercises with muscle, tracking type and splits. Optionally filter by split or a name/muscle substring. ${NAMES_HINT}`,
    inputSchema: listExercisesInput,
    execute: (input) => listExercisesForChat(input),
  }),
  getRecentWorkouts: tool({
    description:
      "Get the most recent workouts (drafts and completed) with date, split, working sets done, total volume and a link.",
    inputSchema: getRecentWorkoutsInput,
    execute: (input) => getRecentWorkouts(input),
  }),
  getExerciseProgress: tool({
    description: `Get week-by-week best weight, reps, RIR, volume and estimated 1RM for one exercise. ${NAMES_HINT}`,
    inputSchema: getExerciseProgressInput,
    execute: (input) => getExerciseProgress(input),
  }),
  getPersonalRecords: tool({
    description: `Get personal records (heaviest weight, best e1RM, most reps, best set volume) for one exercise, or all exercises when omitted. ${NAMES_HINT}`,
    inputSchema: getPersonalRecordsInput,
    execute: (input) => getPersonalRecords(input),
  }),
  getTrainingProfile: tool({
    description: "Get the user's training profile (current body weight, if set).",
    inputSchema: getTrainingProfileInput,
    execute: () => getTrainingProfileForChat(),
  }),
  getActiveDraft: tool({
    description:
      "Get the in-progress (draft) workout, if any, with sets done vs total and a link. Check this before suggesting to start a new workout.",
    inputSchema: getActiveDraftInput,
    execute: () => getActiveDraft(),
  }),
  createExercise: tool({
    description: `Create a new exercise and assign it to existing splits. Requires user approval (the UI shows an approval card). Call listSplits first; every entry in "splits" must be an existing split name. Do not ask for textual confirmation — call this tool directly.`,
    inputSchema: createExerciseInput,
    execute: async (input): Promise<CreateExerciseOutput> => {
      try {
        const { id, syncedDraftIds } = await createExerciseCore({
          name: input.name,
          muscle: input.muscle,
          splits: input.splits,
          default_sets: input.default_sets,
          tracking_type: input.tracking_type,
          notes: input.notes,
          machine_start_weight: null,
          machine_end_weight: null,
          machine_increment: null,
          default_reps: input.default_reps,
          progressive_overload_increment: null,
          rest_seconds: input.rest_seconds,
          stretch_kind: "none",
          duration_start_seconds: null,
          duration_end_seconds: null,
          duration_step_seconds: null,
        });

        for (const draftId of syncedDraftIds) {
          revalidatePath(`/workout/${draftId}`);
          revalidatePath("/");
        }
        revalidatePath("/settings/exercises");
        revalidatePath("/workout/start");
        revalidatePath("/progress");

        return { exerciseId: id, name: input.name, splits: input.splits };
      } catch (error) {
        return { error: toErrorMessage(error) };
      }
    },
  }),
  startWorkout: tool({
    description: `Start a new workout draft for an existing split. Requires user approval (the UI shows an approval card). Call listSplits first and use an exact split name. Do not ask for textual confirmation — call this tool directly. Returns a link the user can open.`,
    inputSchema: startWorkoutInput,
    execute: async (input): Promise<StartWorkoutOutput> => {
      try {
        const { id } = await createWorkoutDraft(input.split);

        revalidatePath("/");
        revalidatePath("/history");

        return { workoutId: id, split: input.split, url: workoutUrl(id) };
      } catch (error) {
        return { error: toErrorMessage(error) };
      }
    },
  }),
};

/** Per-tool approval policy for streamText's `toolApproval` option: WRITE tools always wait for the user. */
export const WRITE_TOOL_APPROVAL = {
  createExercise: "user-approval",
  startWorkout: "user-approval",
} as const satisfies Record<WriteToolName, "user-approval">;
