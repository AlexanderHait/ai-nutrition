"use client";
import {useMemo,useState} from "react";
import {ImagePlus,Send,X} from "lucide-react";

const templates=[
  {title:"Напоминание о фото",content:"Добрый день! Не забудь зафиксировать сегодняшний приём пищи — это поможет точнее отслеживать прогресс."},
  {title:"Проверка веса",content:"Пора обновить вес в профиле. Актуальное измерение поможет точнее оценить динамику и скорректировать план."},
  {title:"Итоги недели",content:"Неделя подходит к концу. Загляни в раздел «Прогресс» и посмотри, как менялись питание и показатели."},
  {title:"Новая функция",content:"В TeddY появилась новая функция. Посмотри, как она работает 👇"},
];

export default function MailingComposer(){
  const [title,setTitle]=useState(""),[content,setContent]=useState(""),[file,setFile]=useState<File|null>(null);
  const preview=useMemo(()=>file?URL.createObjectURL(file):"",[file]);
  function useTemplate(i:number){setTitle(templates[i].title);setContent(templates[i].content)}
  return <div className="mailingComposer">
    <div className="templateChips">{templates.map((x,i)=><button type="button" key={x.title} onClick={()=>useTemplate(i)}>{x.title}</button>)}</div>
    <form className="mailingForm" action="/api/admin/mailings" method="post" encType="multipart/form-data">
      <label>Название<input name="title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например: Новая функция" required/></label>
      <label>Получатели<select name="segment">
        <option value="all">Все клиенты</option><option value="basic">Только Basic</option><option value="premium">Только Premium</option>
        <option value="loss">Цель: снижение</option><option value="gain">Цель: набор</option><option value="maintain">Цель: поддержание</option>
        <option value="inactive3">Неактивны 3+ дня</option><option value="inactive7">Неактивны 7+ дней</option>
      </select></label>
      <label>Сообщение<textarea name="content" rows={7} value={content} onChange={e=>setContent(e.target.value)} placeholder="Текст сообщения для рассылки…" required/></label>
      <label>Фото <span className="muted">необязательно · JPG/PNG/WebP/GIF · до 10 МБ</span>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:8}}>
          <label className="primary" style={{display:"inline-flex",alignItems:"center",gap:7,cursor:"pointer",padding:"9px 13px",borderRadius:12}}>
            <ImagePlus size={16}/>Добавить фото
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:"none"}} onChange={e=>setFile(e.target.files?.[0]||null)}/>
          </label>
          {file&&<button type="button" onClick={()=>setFile(null)}><X size={15}/> Убрать</button>}
        </div>
      </label>
      <div className="telegramPreview"><span>Предпросмотр</span><div><b>TeddY</b>{preview&&<img src={preview} alt="" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:12,marginTop:8}}/>}<p>{content||"Здесь появится сообщение, которое получат клиенты."}</p></div></div>
      <label>Дата и время<input type="datetime-local" name="scheduled_at"/></label>
      <div className="mailActions"><button className="primary" name="action" value="send" type="submit"><Send size={16}/>Отправить сейчас</button><button name="action" value="schedule" type="submit">Запланировать</button></div>
    </form>
  </div>;
}
