"use client";

import type { SupportMessage } from "@/lib/support-types";
import { SupportAttachment } from "./SupportAttachment";

export function SupportMessageBody({ message }: { message: SupportMessage }) {
  const text = String(message.content || "").trim();
  const onlyPlaceholderPhoto = message.attachment_path && text === "Фото";

  return (
    <div>
      {message.attachment_path ? (
        <SupportAttachment
          path={message.attachment_path}
          name={message.attachment_name}
        />
      ) : null}

      {text && !onlyPlaceholderPhoto ? (
        <div className="supportMessageText">
          {text}
        </div>
      ) : null}
    </div>
  );
}
