import {
  REPS_PRESETS,
  RIR_PRESETS,
  mergeNumberOptions,
  mergeWeightOptions,
  weightHeader,
} from "@/components/workout/setFieldPresets";
import type { FlatSetRow } from "@/components/workout/groupSets";
import { useSetEditor } from "@/components/workout/useSetEditor";
import type { SetType } from "@/lib/database.types";
import { formatDurationSeconds } from "@/lib/duration";
import { useSetElapsed } from "@/lib/useSetElapsed";

const NOTE_PREVIEW_MAX = 36;

type Props = {
  row: FlatSetRow;
  weightPresets: number[];
  durationPresets: number[];
  showWeightCol: boolean;
  bodyWeight: number | null;
  readOnly?: boolean;
  onRequestRemove: (setId: string) => void;
  onOpenNote: (setId: string, initial: string) => void;
  onSetTypeChange?: (setId: string, setType: SetType) => void;
  onDoneRest?: () => void;
  onSetCompleted?: (setId: string, completedAt: string | null) => void;
  onSetStarted?: (setId: string, startedAt: string | null) => void;
  onSetFieldsChange?: (
    setId: string,
    fields: {
      reps: number | null;
      weight: number | null;
      rir: number | null;
      duration_seconds: number | null;
    },
  ) => void;
};

export function SetTableRow({
  row,
  weightPresets,
  durationPresets,
  showWeightCol,
  bodyWeight,
  readOnly,
  onRequestRemove,
  onOpenNote,
  onSetTypeChange,
  onDoneRest,
  onSetCompleted,
  onSetStarted,
  onSetFieldsChange,
}: Props) {
  const {
    reps,
    setReps,
    weight,
    setWeight,
    rir,
    setRir,
    duration,
    setDuration,
    volumeLocal,
    isDone,
    hasStarted,
    startedAt,
    readyToComplete,
    markDonePending,
    clearDonePending,
    startPending,
    markDoneError,
    handleStartSet,
    handleMarkDone,
    handleClearDone,
    timerEndAt,
    timerRemaining,
    startTimer,
  } = useSetEditor({
    row,
    bodyWeight,
    readOnly,
    onDoneRest,
    onSetCompleted,
    onSetStarted,
    onSetFieldsChange,
  });

  const setElapsedSeconds = useSetElapsed(startedAt, row.completed_at);

  const savedNote = row.note ?? "";
  const notePreview =
    savedNote.trim().length > 0
      ? savedNote.length > NOTE_PREVIEW_MAX
        ? `${savedNote.slice(0, NOTE_PREVIEW_MAX)}…`
        : savedNote
      : null;

  const tt = row.tracking_type;
  const repsOptions = mergeNumberOptions(REPS_PRESETS, reps);
  const weightOptions = mergeWeightOptions(tt, weightPresets, weight);
  const rirOptions = mergeNumberOptions(RIR_PRESETS, rir);
  const durationOptions = mergeNumberOptions(durationPresets, duration);

  const cellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-[var(--gray-300)] bg-[var(--chalk-white)] px-1.5 text-sm dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]";
  const readOnlyCellInput =
    "box-border h-10 min-h-10 w-full min-w-0 rounded border border-[var(--gray-300)] bg-[var(--gray-50)] px-1.5 text-sm text-right tabular-nums text-[var(--steel-gray)] cursor-default dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--gray-300)]";

  const rowBg = isDone
    ? "bg-emerald-50/70 dark:bg-emerald-900/20"
    : "";

  const fieldsLocked = readOnly || isDone;

  return (
    <tr
      className={`border-b border-[var(--gray-100)] transition-colors dark:border-[var(--gray-100)] ${rowBg}`}
    >
      <td
        className={`sticky left-0 z-10 py-1 pr-1 text-center text-xs font-semibold tabular-nums ${isDone ? "bg-emerald-50/70 dark:bg-emerald-900/20" : "bg-[var(--chalk-white)] dark:bg-[var(--gray-50)]"}`}
      >
        {row.set_number}
      </td>
      {tt === "timed" ? (
        <td className="py-1 pr-1">
          <div className="flex items-center gap-1">
            <select
              disabled={fieldsLocked}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={cellInput}
              aria-label="Seconds"
            >
              <option value="">—</option>
              {durationOptions.map((v) => (
                <option key={`duration-${row.id}-${v}`} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {!readOnly ? (
              timerEndAt != null ? (
                <span className="font-data w-10 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--gym-amber)]">
                  {timerRemaining}s
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!duration || fieldsLocked}
                  onClick={() => startTimer(Number(duration))}
                  className="shrink-0 rounded px-1.5 py-1 text-xs font-semibold text-[var(--gym-amber)] hover:bg-[var(--gray-100)] disabled:opacity-40 dark:hover:bg-[var(--gray-100)]"
                  aria-label="Start countdown"
                >
                  ▶
                </button>
              )
            ) : null}
          </div>
        </td>
      ) : (
        <td className="py-1 pr-1">
          <select
            disabled={fieldsLocked}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={cellInput}
            aria-label="Reps"
          >
            <option value="">—</option>
            {repsOptions.map((v) => (
              <option key={`reps-${row.id}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      )}
      {showWeightCol && (
        <td className="py-1 pr-1">
          <select
            disabled={fieldsLocked}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={cellInput}
            aria-label={weightHeader(tt)}
          >
            <option value="">—</option>
            {weightOptions.map((v) => (
              <option key={`weight-${row.id}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      )}
      {row.stretch_kind === "none" && (
        <td className="py-1 pr-1">
          <select
            disabled={fieldsLocked}
            value={rir}
            onChange={(e) => setRir(e.target.value)}
            className={cellInput}
            aria-label="RIR"
          >
            <option value="">—</option>
            {rirOptions.map((v) => (
              <option key={`rir-${row.id}-${v}`} value={v}>
                {v}
              </option>
            ))}
          </select>
        </td>
      )}
      {readOnly && (
        <td className="min-w-[4.75rem] py-1 pl-2 pr-1">
          <input
            value={
              volumeLocal == null ? "—" : Math.round(volumeLocal).toLocaleString()
            }
            readOnly
            tabIndex={-1}
            aria-label="Set volume"
            className={readOnlyCellInput}
          />
        </td>
      )}
      <td className="min-w-0 max-w-[5rem] py-1 pl-2 pr-1 sm:max-w-[8rem]">
        {readOnly ? (
          <span className="block max-h-10 overflow-hidden break-words px-1.5 text-left text-sm leading-snug text-[var(--gray-600)] line-clamp-2 dark:text-[var(--gray-400)]">
            {notePreview ?? "—"}
          </span>
        ) : (
          <button
            type="button"
            disabled={fieldsLocked}
            onClick={() => onOpenNote(row.id, row.note ?? "")}
            className={`${cellInput} max-h-10 min-h-0 min-w-0 touch-manipulation overflow-hidden text-left leading-snug line-clamp-2 disabled:opacity-70`}
            aria-label="Edit note"
          >
            {notePreview ? (
              <span className="block min-w-0 break-words">{notePreview}</span>
            ) : (
              <span className="text-[var(--gray-400)]">Add note…</span>
            )}
          </button>
        )}
      </td>
      {!readOnly ? (
        <td className="py-1 pl-1 pr-1">
          <div className="flex items-center justify-end gap-1">
            {hasStarted && setElapsedSeconds != null ? (
              <span className="font-data shrink-0 text-[10px] tabular-nums text-[var(--gray-500)] dark:text-[var(--gray-400)]">
                {formatDurationSeconds(setElapsedSeconds)}
              </span>
            ) : !isDone ? (
              <button
                type="button"
                disabled={startPending}
                onClick={handleStartSet}
                className="shrink-0 rounded bg-[var(--gym-amber)] px-2 py-1 text-xs font-semibold text-[var(--chalk-white)] transition hover:bg-orange-600 disabled:opacity-40"
                aria-label={`Start set ${row.set_number}`}
              >
                {startPending ? "…" : "Start"}
              </button>
            ) : null}
            {markDoneError ? (
              <span
                className="max-w-[5rem] truncate text-[10px] leading-tight text-red-600"
                title={markDoneError}
              >
                !
              </span>
            ) : null}
            {row.set_type === "warmup" ? (
              <button
                type="button"
                onClick={() => onSetTypeChange?.(row.id, "working")}
                className="shrink-0 rounded bg-[var(--gray-200)] px-1.5 py-1 text-xs font-semibold text-[var(--gray-600)] transition hover:bg-[var(--gray-300)] dark:bg-[var(--gray-200)] dark:text-[var(--gray-300)]"
                aria-label="Warmup set — tap to make working"
                title="Warmup set – excluded from volume. Tap to make working."
              >
                W
              </button>
            ) : null}
            {isDone ? (
              <button
                type="button"
                disabled={clearDonePending}
                onClick={handleClearDone}
                className="shrink-0 rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                aria-label={`Edit set ${row.set_number}`}
                title="Tap to edit this set"
              >
                {clearDonePending ? "…" : "Edit"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!readyToComplete || markDonePending}
                onClick={handleMarkDone}
                className="shrink-0 rounded bg-[var(--gym-amber)] px-2 py-1 text-xs font-semibold text-[var(--chalk-white)] transition hover:bg-orange-600 disabled:opacity-40"
                aria-label={`Mark set ${row.set_number} done`}
              >
                {markDonePending ? "…" : "Done"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestRemove(row.id)}
              className="shrink-0 rounded px-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              aria-label={`Remove set ${row.set_number}`}
            >
              ×
            </button>
          </div>
        </td>
      ) : (
        <td className="py-1" />
      )}
    </tr>
  );
}
