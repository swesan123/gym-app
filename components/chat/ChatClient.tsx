"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";

import type { ChatUIMessage } from "@/lib/ai/message";
import { getChatErrorInfo, hasPendingApproval } from "@/lib/chat/clientState";

import { ChatError } from "./ChatError";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

type Props = {
  id: string;
  initialMessages: ChatUIMessage[];
};

const transport = new DefaultChatTransport<ChatUIMessage>({ api: "/api/chat" });

export function ChatClient({ id, initialMessages }: Props) {
  const { messages, status, error, sendMessage, regenerate, stop, addToolApprovalResponse } =
    useChat<ChatUIMessage>({
      id,
      messages: initialMessages,
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });
  const urlSyncedRef = useRef(initialMessages.length > 0);

  const isBusy = status === "submitted" || status === "streaming";
  const approvalPending = useMemo(() => hasPendingApproval(messages), [messages]);
  const lastMessage = messages.at(-1);
  const isWaiting = status === "submitted" || (status === "streaming" && lastMessage?.role === "user");

  useEffect(() => {
    if (urlSyncedRef.current || messages.length === 0) return;
    if (status !== "streaming" && status !== "ready") return;
    urlSyncedRef.current = true;
    window.history.replaceState(null, "", `/chat/${id}`);
  }, [id, messages.length, status]);

  const handleSend = (text: string) => {
    void sendMessage({ text });
  };

  const handleRetry = () => {
    void regenerate();
  };

  const handleStop = () => {
    void stop();
  };

  return (
    <div className="flex min-h-[calc(100dvh-17rem)] flex-col">
      <MessageList
        messages={messages}
        isWaiting={isWaiting}
        canSend={!isBusy && !approvalPending}
        onSuggestion={handleSend}
        onApprovalResponse={addToolApprovalResponse}
      />
      <Composer
        isBusy={isBusy}
        approvalPending={approvalPending}
        notice={error ? <ChatError error={getChatErrorInfo(error)} onRetry={handleRetry} /> : null}
        onSend={handleSend}
        onStop={handleStop}
      />
    </div>
  );
}
