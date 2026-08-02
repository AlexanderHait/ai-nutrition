"use client";

import type { SupportMessage } from "@/lib/support-types";
import { SupportAttachment } from "./SupportAttachment";

export function SupportMessageBody({ message }: { message: SupportMessage }) {
  const text = String(message.content || "").trim();
  const placeholder = Boolean(message.attachment_path) && ["фото", "pdf", "документ"].includes(text.toLowerCase());

  return (
    <div>
      {message.attachment_path ? (
        <SupportAttachment
          path={message.attachment_path}
          name={message.attachment_name}
          mime={message.attachment_mime}
        />
      ) : null}
      {text && !placeholder ? <div className="supportMessageText">{text}</div> : null}
    </div>
  );
}
