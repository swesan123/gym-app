import type { ChatUIMessage } from "@/lib/ai/message";

import { MessagePart } from "./MessagePart";
import type { ApprovalResponder } from "./types";

type Props = {
  message: ChatUIMessage;
  onApprovalResponse: ApprovalResponder;
};

export function ChatMessage({ message, onApprovalResponse }: Props) {
  const isUser = message.role === "user";

  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex min-w-0 flex-col gap-2 ${
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-[var(--gym-amber)] px-4 py-2.5 text-[var(--chalk-white)]"
            : "w-full"
        }`}
      >
        {message.parts.map((part, index) => (
          <MessagePart
            key={`${message.id}-${index}`}
            part={part}
            role={message.role}
            onApprovalResponse={onApprovalResponse}
          />
        ))}
      </div>
    </li>
  );
}
