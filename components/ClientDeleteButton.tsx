"use client";

import { Trash2 } from "lucide-react";

export default function ClientDeleteButton({
  profileId,
  name,
  back = "/admin/clients",
}: {
  profileId: number;
  name: string;
  back?: string;
}) {
  return (
    <form
      action="/api/admin/clients/delete"
      method="post"
      className="clientDeleteForm"
      onSubmit={(event) => {
        const ok = window.confirm(
          `Удалить клиента «${name}» из списка?\n\nПриёмы пищи, переписка и платежи останутся в базе — клиент просто пропадёт из админки. Удаление можно отменить.`,
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="back" value={back} />
      <button className="clientDeleteBtn" type="submit" title={`Удалить ${name}`} aria-label={`Удалить ${name}`}>
        <Trash2 size={15} />
      </button>
    </form>
  );
}
