import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatClient } from "@/components/chat/ChatClient";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import type { ChatUIMessage } from "@/lib/ai/message";
import { loadChat } from "@/lib/chat/store";
import { hasSupabaseEnv } from "@/lib/env";

type Props = { params: Promise<{ chatId: string }> };

export default async function ChatDetailPage({ params }: Props) {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const { chatId } = await params;
  const chat = await loadChat(chatId);

  if (!chat) {
    notFound();
  }

  return (
    <div className="px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-2 flex items-start justify-between gap-3">
        <h1 className="line-clamp-2 min-w-0 text-3xl font-bold tracking-tight text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          {chat.title}
        </h1>
        <Link
          href="/chat"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-4 py-2 text-sm font-semibold text-[var(--steel-gray)] transition hover:bg-[var(--gray-100)] dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--chalk-white)] dark:hover:bg-[var(--gray-200)]"
        >
          New chat
        </Link>
      </header>

      <ChatClient id={chat.id} initialMessages={chat.messages as ChatUIMessage[]} />
    </div>
  );
}
