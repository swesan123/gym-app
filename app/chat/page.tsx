import { ChatClient } from "@/components/chat/ChatClient";
import { RecentChats } from "@/components/chat/RecentChats";
import { MissingSupabaseConfig } from "@/components/MissingSupabaseConfig";
import { listChats } from "@/lib/chat/store";
import { hasOpenRouterEnv, hasSupabaseEnv } from "@/lib/env";

const RECENT_CHATS_LIMIT = 10;

const loadRecentChats = async () => {
  try {
    return await listChats(RECENT_CHATS_LIMIT);
  } catch {
    return null;
  }
};

export default async function ChatPage() {
  if (!hasSupabaseEnv()) {
    return <MissingSupabaseConfig />;
  }

  const id = crypto.randomUUID();
  const recentChats = await loadRecentChats();

  return (
    <div className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-2">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          Coach
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Ask about your training, add exercises, or start a workout
        </p>
      </header>

      {hasOpenRouterEnv() ? null : (
        <p
          role="status"
          className="mt-4 rounded-lg border border-[var(--gym-amber)]/30 bg-[var(--gym-amber)]/5 p-3 text-sm text-[var(--steel-gray)] dark:border-[var(--gym-amber)]/40 dark:bg-[var(--gym-amber)]/10 dark:text-[var(--chalk-white)]"
        >
          The AI assistant is not configured. Set{" "}
          <code className="rounded bg-[var(--gray-100)] px-1">OPENROUTER_API_KEY</code> in your environment to
          enable chat.
        </p>
      )}

      <ChatClient id={id} initialMessages={[]} />

      {recentChats ? (
        <RecentChats chats={recentChats} />
      ) : (
        <p role="alert" className="mt-10 text-sm text-[var(--muted-red)] dark:text-red-300">
          Couldn&apos;t load recent chats.
        </p>
      )}
    </div>
  );
}
