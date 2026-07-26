import {requireClient} from '@/lib/auth';
import {clientData} from '@/lib/data';
import SupportThread from '@/components/SupportThread';

export const dynamic='force-dynamic';

export default async function Page(){
  const s=await requireClient();
  const d=await clientData(s.chatId!);

  return <>
    <div className="pageHead">
      <div>
        <p>Связь с командой</p>
        <h1>Поддержка</h1>
        <span>Здесь отвечает человек, а не AI‑бот</span>
      </div>
    </div>

    <section className="supportCard card">
      <div className="supportHeader">
        <div>
          <b>AI‑Nutrition</b>
          <span>Вопросы, пожелания и обратная связь</span>
        </div>
        <i className="supportOnline"/>
      </div>

      <SupportThread messages={d.support as any[]} role="client"/>

      <form action="/api/support/client" method="post" className="supportComposer">
        <textarea
          name="content"
          rows={2}
          maxLength={3000}
          placeholder="Напиши сообщение…"
          required
        />
        <button className="primary" type="submit">Отправить</button>
      </form>
    </section>
  </>;
}
