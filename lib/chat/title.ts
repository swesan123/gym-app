import { isTextUIPart, type UIMessage } from "ai";

const MAX_TITLE_LENGTH = 60;
const ELLIPSIS = "...";

export function deriveChatTitle(messages: UIMessage[]): string | null {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) {
    return null;
  }

  const text = firstUser.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  if (text.length <= MAX_TITLE_LENGTH) {
    return text;
  }

  const sliceLength = MAX_TITLE_LENGTH - ELLIPSIS.length;
  return `${text.slice(0, sliceLength).trimEnd()}${ELLIPSIS}`;
}
