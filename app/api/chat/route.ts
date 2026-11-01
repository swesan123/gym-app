import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { NextResponse } from "next/server";

import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { chatTools, WRITE_TOOL_APPROVAL } from "@/lib/ai/tools";
import type { ChatUIMessage } from "@/lib/ai/message";
import { ensureChat, saveMessages } from "@/lib/chat/store";
import {
  getOpenRouterModel,
  getToolApprovalSecret,
  hasOpenRouterEnv,
  hasSupabaseEnv,
} from "@/lib/env";

export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ERROR_LENGTH = 200;

const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

const toSafeErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  const reason = raw
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ERROR_LENGTH);
  return `The AI service failed: ${reason || "unknown error"}`;
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return jsonError("AI chat is not configured: set Supabase env vars", 503);
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!hasOpenRouterEnv() || !apiKey) {
    return jsonError("AI chat is not configured: set OPENROUTER_API_KEY", 503);
  }
  const approvalSecret = getToolApprovalSecret();
  if (!approvalSecret && process.env.NODE_ENV === "production") {
    return jsonError(
      "AI chat is not configured: set TOOL_APPROVAL_SECRET (32+ characters)",
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { id, messages } = (body ?? {}) as { id?: unknown; messages?: unknown };
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return jsonError("Invalid chat id", 400);
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError("Missing messages", 400);
  }

  const validation = await safeValidateUIMessages<ChatUIMessage>({
    messages,
    tools: chatTools,
  });
  if (!validation.success) {
    console.warn("[api/chat] invalid messages:", validation.error.message);
    return jsonError("Invalid messages", 400);
  }
  const validated = validation.data;

  try {
    await ensureChat(id);
  } catch (error) {
    console.error("[api/chat] ensureChat failed:", error);
    return jsonError("Could not open chat", 500);
  }

  const openrouter = createOpenRouter({
    apiKey,
    headers: { "X-Title": "GymLog" },
  });

  const result = streamText({
    model: openrouter(getOpenRouterModel()),
    instructions: buildSystemPrompt({ today: new Date().toISOString().slice(0, 10) }),
    messages: await convertToModelMessages(validated),
    tools: chatTools,
    toolApproval: WRITE_TOOL_APPROVAL,
    ...(approvalSecret ? { experimental_toolApprovalSecret: approvalSecret } : {}),
    stopWhen: isStepCount(8),
  });

  // No await: drains the model stream so onEnd persists history even if the client disconnects.
  void result.consumeStream({
    onError: (error) => console.error("[api/chat] stream error:", error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools: chatTools,
      originalMessages: validated,
      onError: (error) => {
        console.error("[api/chat] model error:", error);
        return toSafeErrorMessage(error);
      },
      onEnd: async ({ messages: finalMessages }) => {
        try {
          await saveMessages(id, finalMessages);
        } catch (error) {
          console.error("[api/chat] saveMessages failed:", error);
        }
      },
    }),
  });
}
