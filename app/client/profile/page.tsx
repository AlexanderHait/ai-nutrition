import Link from "next/link";
import TelegramAvatar from "@/components/TelegramAvatar";
import { CheckCircle2, Flame, Link2, RefreshCw, Scale, Target, UserRound } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientProfileAccountData } from "@/lib/account-data";
import { fmt, goalKind } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireClient();
  const data = await clientProfileAccountData(currentUser.accountId!);
  const query = await searchParams;
  const currentWeight = Number(data.settings?.current_weight_kg || data.weights?.[0]?.weight_kg || 0);
  const targetWeight = Number(data.settings?.target_weight_kg || 0);
  const kcal = Number(data.settings?.kcal_target || 2000);
  const telegramLinked = Boolean(data.account?.telegram_id);

  return (
    <>
      <div className="pageHead">
        <div><p>Профиль</p><h1>Мои данные</h1><span>Один аккаунт для сайта, Telegram и подписки.</span></div>
      </div>

      {query.saved === "1" ? <div className="successNotice"><CheckCircle2 size={17} />Сохранено.</div> : null}
      {query.password === "updated" ? <div className="successNotice"><CheckCircle2 size={17} />Пароль обновлён.</div> : null}
      {query.telegram === "linked" ? <div className="successNotice"><CheckCircle2 size={17} />Telegram безопасно привязан к аккаунту.</div> : null}
      {query.telegram === "already_linked" ? <div className="errorNotice">Этот Telegram уже связан с другим аккаунтом.</div> : null}
      {query.telegram === "link_error" ? <div className="errorNotice">Не удалось привязать Telegram. Данные не изменены.</div> : null}
      {query.sync === "ok" ? <div className="successNotice"><CheckCircle2 size={17} />Данные Telegram обновлены.</div> : null}
      {query.sync === "error" ? <div className="errorNotice">Не удалось обновить данные Telegram.</div> : null}

      <section className="clientProfileHero">
        <TelegramAvatar profile={data.profile} size="huge" />
        <div className="profileHeroCopy">
          <h2>{data.profile?.first_name || currentUser.name || "Клиент"}</h2>
          <p>{telegramLinked ? (data.profile?.username ? `@${data.profile.username}` : "Telegram привязан") : "Аккаунт TeddY"}</p>
          <div className="clientTags">
            <span><Target size={13} />{goalKind(data.settings?.goal)}</span>
            <span><Flame size={13} />{fmt(kcal)} ккал</span>
            {currentWeight > 0 ? <span><Scale size={13} />{fmt(currentWeight, 1)} кг</span> : null}
          </div>
        </div>
        {telegramLinked ? (
          <form action="/api/profile/telegram-sync" method="post" className="telegramSyncForm">
            <input type="hidden" name="return_to" value="/client/profile" />
            <button className="secondaryBtn" type="submit"><RefreshCw size={15} />Обновить из Telegram</button>
          </form>
        ) : (
          <Link className="secondaryBtn" href="/api/auth/telegram?mode=link"><Link2 size={15} />Привязать Telegram</Link>
        )}
      </section>

      <div className="profileLayout top">
        <section className="card profileCardV2">
          <div className="sectionTitleRow"><div><h2>Параметры питания</h2><span className="muted">Изменения применяются после сохранения</span></div><UserRound size={19} /></div>
          <form action="/api/client/settings" method="post" className="form profileForm modern">
            <div className="formSection">
              <div className="formSectionTitle">Цель и основные данные</div>
              <label>Цель<select name="goal" defaultValue={data.settings?.goal || ""}><option value="">Не выбрана</option><option value="Снижение веса">Снижение веса</option><option value="Поддержание">Поддержание</option><option value="Набор массы">Набор массы</option></select></label>
              <div className="grid2"><label>Пол<select name="sex" defaultValue={data.settings?.sex || ""}><option value="">Не указан</option><option value="male">Мужской</option><option value="female">Женский</option></select></label><label>Возраст<input name="age_years" type="number" min="14" max="100" defaultValue={data.settings?.age_years || ""} /></label></div>
              <div className="grid2"><label>Дата рождения<input name="birth_date" type="date" defaultValue={data.settings?.birth_date || ""} /></label><label>Активность<select name="activity_level" defaultValue={data.settings?.activity_level || ""}><option value="">Не указана</option><option value="low">Низкая</option><option value="light">Лёгкая</option><option value="moderate">Средняя</option><option value="high">Высокая</option><option value="very_high">Очень высокая</option></select></label></div>
              <div className="grid2"><label>Рост, см<input name="height_cm" type="number" min="100" max="250" step="0.1" defaultValue={data.settings?.height_cm || ""} /></label><label>Целевые калории<input name="kcal_target" type="number" min="800" max="7000" defaultValue={data.settings?.kcal_target || 2000} /></label></div>
            </div>
            <div className="formSection"><div className="formSectionTitle">Вес</div><div className="grid2"><label>Текущий вес, кг<input name="current_weight_kg" type="number" min="30" max="400" step="0.1" defaultValue={currentWeight || ""} /></label><label>Целевой вес, кг<input name="target_weight_kg" type="number" min="30" max="400" step="0.1" defaultValue={targetWeight || ""} /></label></div></div>
            <div className="formSection"><div className="formSectionTitle">Целевые БЖУ</div><div className="macroInputs">
              <label>Белки, г<input name="protein_target" type="number" min="0" max="500" step="0.1" defaultValue={data.settings?.protein_target || ""} /></label>
              <label>Жиры, г<input name="fat_target" type="number" min="0" max="500" step="0.1" defaultValue={data.settings?.fat_target || ""} /></label>
              <label>Углеводы, г<input name="carb_target" type="number" min="0" max="1000" step="0.1" defaultValue={data.settings?.carb_target || ""} /></label>
            </div></div>
            <button className="primary saveProfileButton" type="submit">Сохранить изменения</button>
          </form>
        </section>

        <aside className="profileAside">
          <section className="card profileGoalCard"><h2>Цель</h2><div className="goalBig">{goalKind(data.settings?.goal)}</div>{currentWeight > 0 && targetWeight > 0 ? <><div className="goalWeightLine"><span>Сейчас</span><b>{fmt(currentWeight, 1)} кг</b></div><div className="goalWeightLine"><span>Цель</span><b>{fmt(targetWeight, 1)} кг</b></div><div className="weightTarget">Осталось: <b>{fmt(Math.abs(currentWeight - targetWeight), 1)} кг</b></div></> : <p className="muted">Заполни текущий и целевой вес.</p>}</section>
          <section className="card"><div className="sectionTitleRow"><div><h2>Новое измерение</h2><span className="muted">Добавится в историю прогресса</span></div></div><form action="/api/client/weight" method="post" className="quickWeightForm vertical"><input name="weight_kg" type="number" min="30" max="400" step="0.1" placeholder="Например, 68.4" required /><button className="primary" type="submit">Записать вес</button></form></section>
        </aside>
      </div>
    </>
  );
}
