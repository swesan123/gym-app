import { isDataUIPart } from "ai";
import { Streamdown } from "streamdown";

import { mutedTextClass } from "./styles";
import { ToolApprovalCard } from "./ToolApprovalCard";
import { ToolPart } from "./ToolPart";
import type { ApprovalResponder, ChatPart } from "./types";

type Props = {
  part: ChatPart;
  role: "user" | "assistant" | "system";
  onApprovalResponse: ApprovalResponder;
};

const markdownClass =
  "text-[15px] leading-6 text-[var(--steel-gray)] dark:text-[var(--chalk-white)] [&_a]:text-[var(--gym-amber)] [&_a]:underline [&>*:first-child]:mt-0 [&>*:last-child]:mb-0";

export function MessagePart({ part, role, onApprovalResponse }: Props) {
  if (isDataUIPart(part)) return null;

  switch (part.type) {
    case "text":
      if (role === "user") {
        return <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{part.text}</p>;
      }
      return (
        <Streamdown className={markdownClass} controls={false} isAnimating={part.state === "streaming"}>
          {part.text}
        </Streamdown>
      );

    case "reasoning":
      if (!part.text.trim()) return null;
      return (
        <details className={`text-sm ${mutedTextClass}`}>
          <summary className="min-h-6 w-fit cursor-pointer select-none font-medium">Thinking</summary>
          <p className="mt-1 whitespace-pre-wrap border-l-2 border-[var(--gray-200)] pl-3">{part.text}</p>
        </details>
      );

    case "tool-listSplits":
    case "tool-listExercises":
    case "tool-getRecentWorkouts":
    case "tool-getExerciseProgress":
    case "tool-getPersonalRecords":
    case "tool-getTrainingProfile":
    case "tool-getActiveDraft":
    case "tool-getReturnPlan":
      return <ToolPart part={part} />;

    case "tool-createExercise":
    case "tool-startWorkout":
      return <ToolApprovalCard part={part} onApprovalResponse={onApprovalResponse} />;

    case "source-url":
      return (
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-fit text-xs underline ${mutedTextClass}`}
        >
          {part.title ?? part.url}
        </a>
      );

    case "file":
      return (
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-fit text-xs underline ${mutedTextClass}`}
        >
          {part.filename ?? "Attachment"}
        </a>
      );

    case "step-start":
    case "custom":
    case "dynamic-tool":
    case "source-document":
    case "reasoning-file":
      return null;

    default: {
      const exhaustive: never = part;
      return exhaustive;
    }
  }
}
