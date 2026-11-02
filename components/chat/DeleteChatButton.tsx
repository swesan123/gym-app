"use client";

import { useState, useTransition } from "react";

import { deleteChatAction } from "@/app/actions/chats";
import { Modal } from "@/components/ui/modal";

import { mutedTextClass } from "./styles";

type Props = {
  chatId: string;
  title: string;
};

export function DeleteChatButton({ chatId, title }: Props) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setOpen(false);
    setFailed(false);
    startTransition(async () => {
      try {
        await deleteChatAction(chatId);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Delete chat: ${title}`}
        disabled={pending}
        onClick={() => setOpen(true)}
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-lg transition hover:bg-[var(--gray-100)] hover:text-[var(--muted-red)] disabled:opacity-50 ${mutedTextClass}`}
      >
        <span aria-hidden="true">✕</span>
      </button>
      {failed ? (
        <span role="alert" className="text-xs text-[var(--muted-red)] dark:text-red-300">
          Couldn&apos;t delete
        </span>
      ) : null}
      <Modal
        open={open}
        title="Delete chat?"
        description="This permanently deletes the conversation."
        variant="danger"
        confirmLabel="Delete chat"
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
