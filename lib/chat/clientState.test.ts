import { APICallError } from "ai";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { getChatErrorInfo, hasPendingApproval } from "@/lib/chat/clientState";

const apiError = (statusCode: number, body: string) =>
  new APICallError({ message: body, url: "/api/chat", requestBodyValues: undefined, statusCode, responseBody: body });

describe("getChatErrorInfo", () => {
  it("maps 401 to unauthorized", () => {
    const info = getChatErrorInfo(apiError(401, '{"error":"Unauthorized"}'));
    expect(info.kind).toBe("unauthorized");
  });

  it("maps 503 to not-configured and surfaces the server message", () => {
    const info = getChatErrorInfo(apiError(503, '{"error":"OPENROUTER_API_KEY is not set"}'));
    expect(info).toEqual({ kind: "not-configured", message: "OPENROUTER_API_KEY is not set" });
  });

  it("falls back to the error message for other errors", () => {
    expect(getChatErrorInfo(new Error("boom"))).toEqual({ kind: "generic", message: "boom" });
  });

  it("uses a default message when there is none", () => {
    expect(getChatErrorInfo(new Error("")).message).toMatch(/try again/i);
  });
});

describe("hasPendingApproval", () => {
  const assistant = (state: string): UIMessage => ({
    id: "a1",
    role: "assistant",
    parts: [
      {
        type: "tool-startWorkout",
        toolCallId: "t1",
        state,
        input: { split: "Push" },
        approval: { id: "ap1" },
      } as unknown as UIMessage["parts"][number],
    ],
  });

  it("detects approval-requested tool parts", () => {
    expect(hasPendingApproval([assistant("approval-requested")])).toBe(true);
  });

  it("ignores resolved tool parts", () => {
    expect(hasPendingApproval([assistant("approval-responded"), assistant("output-denied")])).toBe(false);
  });

  it("returns false for plain text messages", () => {
    expect(hasPendingApproval([{ id: "u", role: "user", parts: [{ type: "text", text: "hi" }] }])).toBe(false);
  });
});
