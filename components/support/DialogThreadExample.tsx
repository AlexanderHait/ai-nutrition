// Optional example only. This file is not used by /admin/dialogs.
import type {SupportMessage} from "@/lib/support-types";
import {SupportComposer} from "@/components/support/SupportComposer";
import {SupportMessageBody} from "@/components/support/SupportMessageBody";

export function DialogThreadExample({
  selectedChatId,
  messages,
}: {
  selectedChatId: number | null;
  messages: SupportMessage[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id}>
            <SupportMessageBody message={message} />
          </div>
        ))}
      </div>
      <SupportComposer chatId={selectedChatId} />
    </div>
  );
}
