import { requireClient } from "@/lib/auth";
import { clientData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await requireClient();
  const d = await clientData(s.chatId!);

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Аккаунт</p>
          <h1>Профиль</h1>
          <span>Цели, которые используются в личном кабинете</span>
        </div>
      </div>

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
            Цель
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
        <h2>Вес</h2>
        <form action="/api/client/weight" method="post" className="form">
          <label>
            Текущий вес, кг
            <input
              name="weight_kg"
              type="number"
              min="30"
              max="400"
              step="0.1"
              defaultValue={d.settings?.current_weight_kg || ""}
              required
            />
          </label>
          <button className="primary" type="submit">Записать вес</button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          Новая запись попадёт в историю прогресса.
        </p>
      </section>
    </>
  );
}
