// EXAMPLE ONLY — adapt names to your existing Dialogs component.

import type { SupportMessage } from "@/lib/support-types";
import { SupportComposer } from "@/components/support/SupportComposer";
import { SupportMessageBody } from "@/components/support/SupportMessageBody";

export function DialogThreadExample({
  selectedChatId,
  messages,
  reloadMessages,
}: {
  selectedChatId: number | null;
  messages: SupportMessage[];
  reloadMessages: () => void | Promise<void>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender === "admin"
                ? "ml-auto mb-3 max-w-[72%] rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-3"
                : "mr-auto mb-3 max-w-[72%] rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            }
          >
            <SupportMessageBody message={m} />
          </div>
        ))}
      </div>

      <SupportComposer chatId={selectedChatId} onSent={reloadMessages} />
    </div>
  );
}
