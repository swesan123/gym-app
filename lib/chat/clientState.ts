import { APICallError, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

export type ChatErrorKind = "unauthorized" | "not-configured" | "generic";

export type ChatErrorInfo = {
  kind: ChatErrorKind;
  message: string;
};

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const parseErrorBody = (body: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null || !("error" in parsed)) return null;
    return typeof parsed.error === "string" ? parsed.error : null;
  } catch {
    return null;
  }
};

export const getChatErrorInfo = (error: Error): ChatErrorInfo => {
  const statusCode = APICallError.isInstance(error) ? error.statusCode : undefined;
  const bodyMessage = parseErrorBody(error.message);

  if (statusCode === 401) {
    return { kind: "unauthorized", message: "Session expired — log in again." };
  }
  if (statusCode === 503) {
    return {
      kind: "not-configured",
      message: bodyMessage ?? "The AI assistant isn't configured. Set OPENROUTER_API_KEY and restart.",
    };
  }
  return { kind: "generic", message: bodyMessage ?? (error.message || GENERIC_ERROR_MESSAGE) };
};

export const hasPendingApproval = (messages: UIMessage[]): boolean =>
  messages.some(
    (message) =>
      message.role === "assistant" &&
      message.parts.some((part) => isToolUIPart(part) && part.state === "approval-requested"),
  );
