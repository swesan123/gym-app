"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { mutedTextClass } from "./styles";

type Props = {
  isBusy: boolean;
  approvalPending: boolean;
  notice?: ReactNode;
  onSend: (text: string) => void;
  onStop: () => void;
};

const MAX_HEIGHT_PX = 136;

const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

export function Composer({ isBusy, approvalPending, notice, onSend, onStop }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const helperId = useId();

  const canSend = value.trim().length > 0 && !isBusy && !approvalPending;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (isTouchDevice()) return;
    event.preventDefault();
    submit();
  };

  return (
    <div className="sticky bottom-[calc(3.3rem+env(safe-area-inset-bottom))] z-30 -mx-4 border-t border-[var(--gray-200)] bg-[var(--background)]/95 px-4 pb-3 pt-3 backdrop-blur">
      {notice}
      {approvalPending ? (
        <p id={helperId} className={`mb-2 text-xs font-medium ${mutedTextClass}`}>
          Approve or deny the action above to continue
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Message
          </label>
          <textarea
            ref={textareaRef}
            id={inputId}
            rows={1}
            value={value}
            disabled={approvalPending}
            aria-describedby={approvalPending ? helperId : undefined}
            placeholder="Message your coach…"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            className="block max-h-[136px] min-h-11 w-full resize-none rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 py-2.5 text-base leading-6 text-[var(--steel-gray)] placeholder:text-[var(--gray-400)] focus:border-[var(--gym-amber)] focus:outline-none focus:ring-2 focus:ring-[var(--gym-amber)]/30 disabled:opacity-50 dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--chalk-white)]"
          />
        </div>
        {isBusy ? (
          <Button variant="secondary" aria-label="Stop generating" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" aria-label="Send message" disabled={!canSend}>
            Send
          </Button>
        )}
      </form>
    </div>
  );
}
