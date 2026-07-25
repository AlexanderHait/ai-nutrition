import { requireClient } from "@/lib/auth";
import { clientData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireClient();
  const d = await clientData(s.chatId!);
  const q = await searchParams;

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Аккаунт</p>
          <h1>Профиль</h1>
          <span>Цели, по которым сайт считает твой прогресс</span>
        </div>
      </div>

      {q.saved === "1" && <div className="successNotice">Цели сохранены.</div>}

      <section className="card profileCard">
        <div className="profileHero">
          <div className="avatar">{(d.profile?.first_name || "К")[0]}</div>
          <div>
            <h2>{d.profile?.first_name || "Клиент"}</h2>
            <p>{d.profile?.username ? "@" + d.profile.username : `Telegram ID ${s.chatId}`}</p>
          </div>
        </div>

        <form action="/api/client/settings" method="post" className="form" style={{ marginTop: 26 }}>
          <label>
            Основная цель
            <select name="goal" defaultValue={d.settings?.goal || ""}>
              <option value="">Не выбрана</option>
              <option value="Снижение веса">Снижение веса</option>
              <option value="Поддержание">Поддержание</option>
              <option value="Набор массы">Набор массы</option>
            </select>
          </label>

          <div className="grid2">
            <label>
              Калории, ккал
              <input name="kcal_target" type="number" min="800" max="7000" step="1" defaultValue={d.settings?.kcal_target || 2000} />
            </label>
            <label>
              Рост, см
              <input name="height_cm" type="number" min="100" max="250" step="0.1" defaultValue={d.settings?.height_cm || ""} />
            </label>
          </div>

          <div className="grid2">
            <label>
              Текущий вес, кг
              <input name="current_weight_kg" type="number" min="30" max="400" step="0.1" defaultValue={d.settings?.current_weight_kg || d.weights?.[0]?.weight_kg || ""} />
            </label>
            <label>
              Целевой вес, кг
              <input name="target_weight_kg" type="number" min="30" max="400" step="0.1" defaultValue={d.settings?.target_weight_kg || ""} />
            </label>
          </div>

          <div className="formSectionTitle">Целевые БЖУ</div>
          <div className="grid2">
            <label>
              Белки, г
              <input name="protein_target" type="number" min="0" max="500" step="0.1" defaultValue={d.settings?.protein_target || ""} />
            </label>
            <label>
              Жиры, г
              <input name="fat_target" type="number" min="0" max="500" step="0.1" defaultValue={d.settings?.fat_target || ""} />
            </label>
          </div>
          <label>
            Углеводы, г
            <input name="carb_target" type="number" min="0" max="1000" step="0.1" defaultValue={d.settings?.carb_target || ""} />
          </label>

          <button className="primary" type="submit">Сохранить цели</button>
        </form>
      </section>

      <section className="card top">
        <h2>Новое измерение веса</h2>
        <form action="/api/client/weight" method="post" className="quickWeightForm">
          <input
            name="weight_kg"
            type="number"
            min="30"
            max="400"
            step="0.1"
            placeholder="Например, 68.4"
            required
          />
          <button className="primary" type="submit">Записать</button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          Запись добавится в историю прогресса.
        </p>
      </section>

      <section className="card top mobileProfileLogout">
        <h2>Аккаунт</h2>
        <form action="/api/auth/logout" method="post">
          <button className="secondaryDanger" type="submit">Выйти из профиля</button>
        </form>
      </section>
    </>
  );
}
