import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";

import { deriveChatTitle } from "@/lib/chat/title";

function userMessage(text: string, extraParts: UIMessage["parts"] = []): UIMessage {
  return {
    id: "u1",
    role: "user",
    parts: [{ type: "text", text }, ...extraParts],
  };
}

describe("deriveChatTitle", () => {
  it("uses text from the first user message", () => {
    const messages: UIMessage[] = [
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
      userMessage("Plan my leg day"),
    ];

    expect(deriveChatTitle(messages)).toBe("Plan my leg day");
  });

  it("ignores non-text parts on the first user message", () => {
    const messages: UIMessage[] = [
      userMessage("", [
        {
          type: "file",
          mediaType: "image/png",
          url: "https://example.com/a.png",
        },
        { type: "text", text: "Visible prompt" },
      ]),
    ];

    expect(deriveChatTitle(messages)).toBe("Visible prompt");
  });

  it("collapses whitespace", () => {
    const messages: UIMessage[] = [userMessage("  too   many\tspaces  ")];

    expect(deriveChatTitle(messages)).toBe("too many spaces");
  });

  it("truncates with ellipsis", () => {
    const longText = "a".repeat(80);
    const messages: UIMessage[] = [userMessage(longText)];

    const title = deriveChatTitle(messages);
    expect(title).toHaveLength(60);
    expect(title?.endsWith("...")).toBe(true);
    expect(title?.startsWith("a".repeat(57))).toBe(true);
  });

  it("returns null when no user text", () => {
    const messages: UIMessage[] = [
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Only assistant" }] },
      {
        id: "u1",
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "application/pdf",
            url: "https://example.com/doc.pdf",
          },
        ],
      },
    ];

    expect(deriveChatTitle(messages)).toBeNull();
  });
});
