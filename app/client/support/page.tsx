import {Headphones,ShieldCheck} from "lucide-react";
import {requireClient} from "@/lib/auth";
import {clientSupportData} from "@/lib/data";
import SupportThread from "@/components/SupportThread";
export const dynamic="force-dynamic";

export default async function Page(){
  const s=await requireClient(),messages=await clientSupportData(s.chatId!);
  return <>
    <div className="pageHead"><div><p>Связь с командой</p><h1>Поддержка</h1><span>Напиши человеку напрямую — без общения с AI.</span></div></div>
    <div className="supportIntro">
      <div><i><Headphones/></i><span><b>Личная поддержка</b><small>Вопросы по сервису, питанию и аккаунту</small></span></div>
      <div><i><ShieldCheck/></i><span><b>Приватный диалог</b><small>Сообщения видны тебе и администратору</small></span></div>
    </div>
    <section className="supportCard card modernSupport">
      <div className="supportHeader"><div className="supportAvatar">AI</div><div><b>AI‑Nutrition</b><span>Команда поддержки</span></div><i className="supportOnline"/></div>
      <SupportThread messages={messages as any[]} role="client"/>
      <form action="/api/support/client" method="post" className="supportComposer"><textarea name="content" rows={2} maxLength={3000} placeholder="Напиши сообщение…" required/><button className="primary" type="submit">Отправить</button></form>
    </section>
  </>;
}
