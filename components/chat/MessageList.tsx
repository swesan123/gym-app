"use client";

import { useEffect, useRef } from "react";

import type { ChatUIMessage } from "@/lib/ai/message";

import { ChatMessage } from "./ChatMessage";
import { mutedTextClass } from "./styles";
import type { ApprovalResponder } from "./types";

const SUGGESTIONS = [
  "Start my Push workout",
  "What are my bench press PRs?",
  "Add a new exercise",
  "How did last week go?",
] as const;

const NEAR_BOTTOM_PX = 120;

type Props = {
  messages: ChatUIMessage[];
  isWaiting: boolean;
  canSend: boolean;
  onSuggestion: (text: string) => void;
  onApprovalResponse: ApprovalResponder;
};

function EmptyState({ canSend, onSuggestion }: Pick<Props, "canSend" | "onSuggestion">) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <p className={`text-sm ${mutedTextClass}`}>Try asking:</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              disabled={!canSend}
              onClick={() => onSuggestion(suggestion)}
              className="min-h-11 rounded-full border border-[var(--gray-300)] bg-[var(--chalk-white)] px-4 py-2 text-sm font-medium text-[var(--steel-gray)] transition hover:border-[var(--gym-amber)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--chalk-white)]"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MessageList({ messages, isWaiting, canSend, onSuggestion, onApprovalResponse }: Props) {
  const stickToBottomRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const bottom = bottomRef.current;
      if (!bottom) return;
      stickToBottomRef.current = bottom.getBoundingClientRect().bottom - window.innerHeight < NEAR_BOTTOM_PX;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (messages.length === 0 || !stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isWaiting]);

  return (
    <div className="flex flex-1 flex-col py-4" role="log" aria-live="polite" aria-label="Conversation">
      {messages.length === 0 ? (
        <EmptyState canSend={canSend} onSuggestion={onSuggestion} />
      ) : (
        <ul className="flex flex-col gap-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onApprovalResponse={onApprovalResponse} />
          ))}
        </ul>
      )}
      {isWaiting ? (
        <p className={`mt-4 text-sm ${mutedTextClass}`} role="status">
          <span
            aria-hidden="true"
            className="mr-2 inline-block size-2 animate-pulse rounded-full bg-[var(--gym-amber)]"
          />
          Thinking…
        </p>
      ) : null}
      <div ref={bottomRef} aria-hidden="true" className="scroll-mb-40" />
    </div>
  );
}
