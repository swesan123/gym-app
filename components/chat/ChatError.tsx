import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ChatErrorInfo } from "@/lib/chat/clientState";

import { linkButtonClass } from "./styles";

type Props = {
  error: ChatErrorInfo;
  onRetry: () => void;
};

export function ChatError({ error, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="mb-3 rounded-lg border border-[var(--muted-red)]/40 bg-[var(--muted-red)]/5 p-3 dark:bg-[var(--muted-red)]/10"
    >
      <p className="text-sm font-medium text-[var(--muted-red)] dark:text-red-300">{error.message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {error.kind === "unauthorized" ? (
          <Link href="/login" className={linkButtonClass}>
            Log in
          </Link>
        ) : (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
