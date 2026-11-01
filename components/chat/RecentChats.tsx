import Link from "next/link";

import { DeleteChatButton } from "./DeleteChatButton";
import { cardClass, mutedTextClass, primaryTextClass } from "./styles";

type ChatSummary = { id: string; title: string; updatedAt: string };

const formatUpdatedAt = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function RecentChats({ chats }: { chats: ChatSummary[] }) {
  return (
    <section aria-labelledby="recent-chats-heading" className="mt-10">
      <h2
        id="recent-chats-heading"
        className={`text-xs font-semibold uppercase tracking-widest ${mutedTextClass}`}
      >
        Recent chats
      </h2>
      {chats.length === 0 ? (
        <p className={`mt-4 text-sm ${mutedTextClass}`}>No conversations yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {chats.map((chat) => (
            <li key={chat.id} className={`${cardClass} flex items-center gap-1 pl-4 pr-1`}>
              <Link href={`/chat/${chat.id}`} className="flex min-h-14 min-w-0 flex-1 flex-col justify-center py-2">
                <span className={`truncate text-sm font-semibold ${primaryTextClass}`}>{chat.title}</span>
                <span className={`font-data text-xs tabular-nums ${mutedTextClass}`}>
                  {formatUpdatedAt(chat.updatedAt)}
                </span>
              </Link>
              <DeleteChatButton chatId={chat.id} title={chat.title} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
