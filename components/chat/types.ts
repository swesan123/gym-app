import type { ReadToolName, WriteToolName } from "@/lib/ai/contracts";
import type { ChatUIMessage } from "@/lib/ai/message";

export type ChatPart = ChatUIMessage["parts"][number];

export type ReadToolPart = Extract<ChatPart, { type: `tool-${ReadToolName}` }>;
export type WriteToolPart = Extract<ChatPart, { type: `tool-${WriteToolName}` }>;

export type ApprovalResponder = (response: { id: string; approved: boolean; reason?: string }) => void;
