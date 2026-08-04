import Link from "next/link";
import { Headphones, Link2, ShieldCheck } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientSupportData } from "@/lib/data";
import SupportThread from "@/components/SupportThread";
import { SupportComposer } from "@/components/support/SupportComposer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Page() {
  const current = await requireClient();
  const chatId = Number(current.chatId || 0);

  if (!chatId) {
    return (
      <>
        <div className="pageHead">
          <div>
            <p>Связь с командой</p>
            <h1>Поддержка</h1>
            <span>Для личного диалога нужно один раз связать аккаунт с Telegram.</span>
          </div>
        </div>
        <section className="card supportUnavailable">
          <i><Headphones size={22} /></i>
          <div>
            <h2>Подключи Telegram</h2>
            <p className="muted">После привязки здесь откроется приватный чат с командой TeddY. Данные аккаунта и подписки сохранятся.</p>
          </div>
          <Link className="primary" href="/api/auth/telegram?mode=link">
            <Link2 size={16} /> Привязать Telegram
          </Link>
        </section>
      </>
    );
  }

  let messages: any[] = [];
  let loadError = false;
  try {
    messages = await clientSupportData(chatId);
  } catch {
    loadError = true;
  }

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Связь с командой</p>
          <h1>Поддержка</h1>
          <span>Напиши человеку напрямую — без общения с AI.</span>
        </div>
      </div>

      <div className="supportIntro">
        <div><i><Headphones /></i><span><b>Личная поддержка</b><small>Вопросы по сервису, питанию и аккаунту</small></span></div>
        <div><i><ShieldCheck /></i><span><b>Приватный диалог</b><small>Сообщения видны тебе и администратору</small></span></div>
      </div>

      {loadError ? (
        <div className="errorNotice">Не удалось загрузить предыдущие сообщения. Новое сообщение всё равно можно отправить.</div>
      ) : null}

      <section className="supportCard card modernSupport">
        <div className="supportHeader">
          <div className="supportAvatar">TY</div>
          <div><b>TeddY</b><span>Команда поддержки</span></div>
          <i className="supportOnline" />
        </div>
        <SupportThread messages={messages} role="client" />
        <SupportComposer chatId={chatId} endpoint="/api/support/client-media" placeholder="Напиши сообщение…" />
      </section>
    </>
  );
}
