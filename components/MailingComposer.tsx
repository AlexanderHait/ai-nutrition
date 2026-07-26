"use client";
import {useState} from "react";
import {Send} from "lucide-react";

const templates=[
  {title:"Напоминание о фото",content:"Добрый день! Не забудь зафиксировать сегодняшний приём пищи — это поможет точнее отслеживать прогресс."},
  {title:"Проверка веса",content:"Пора обновить вес в профиле. Актуальное измерение поможет точнее оценить динамику и скорректировать план."},
  {title:"Итоги недели",content:"Неделя подходит к концу. Загляни в раздел «Прогресс» и посмотри, как менялись питание и показатели."},
  {title:"Возвращаемся в ритм",content:"Давно не было новых записей. Начни с ближайшего приёма пищи — просто отправь фото в бот."},
];

export default function MailingComposer(){
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  function useTemplate(i:number){setTitle(templates[i].title);setContent(templates[i].content)}
  return <div className="mailingComposer">
    <div className="templateChips">{templates.map((x,i)=><button type="button" key={x.title} onClick={()=>useTemplate(i)}>{x.title}</button>)}</div>
    <form className="mailingForm" action="/api/admin/mailings" method="post">
      <label>Название<input name="title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например: Напоминание о фото" required/></label>
      <label>Получатели<select name="segment">
        <option value="all">Все клиенты</option><option value="basic">Только Basic</option><option value="premium">Только Premium</option>
        <option value="loss">Цель: снижение</option><option value="gain">Цель: набор</option><option value="maintain">Цель: поддержание</option>
        <option value="inactive3">Неактивны 3+ дня</option><option value="inactive7">Неактивны 7+ дней</option>
      </select></label>
      <label>Сообщение<textarea name="content" rows={7} value={content} onChange={e=>setContent(e.target.value)} placeholder="Текст сообщения для рассылки…" required/></label>
      <div className="telegramPreview"><span>Предпросмотр</span><div><b>AI‑Nutrition</b><p>{content||"Здесь появится сообщение, которое получат клиенты."}</p></div></div>
      <label>Дата и время<input type="datetime-local" name="scheduled_at"/></label>
      <div className="mailActions"><button className="primary" name="action" value="send" type="submit"><Send size={16}/>Отправить сейчас</button><button name="action" value="schedule" type="submit">Запланировать</button></div>
    </form>
  </div>;
}
