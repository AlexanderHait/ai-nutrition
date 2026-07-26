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
          <p>Профиль питания</p>
          <h1>Мои данные</h1>
          <span>Эти данные использует AI‑нутрициолог в Telegram</span>
        </div>
      </div>

      {q.saved === "1" && (
        <div className="successNotice">
          Сохранено. Бот увидит обновлённый профиль при следующем сообщении.
        </div>
      )}

      <section className="card profileCard">
        <div className="profileHero">
          <div className="avatar">{(d.profile?.first_name || "К")[0]}</div>
          <div>
            <h2>{d.profile?.first_name || "Клиент"}</h2>
            <p>{d.profile?.username ? "@" + d.profile.username : `Telegram ID ${s.chatId}`}</p>
          </div>
        </div>

        <form action="/api/client/settings" method="post" className="form profileForm">
          <div className="formSection">
            <div className="formSectionTitle">Основное</div>
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
                Пол
                <select name="sex" defaultValue={d.settings?.sex || ""}>
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </label>
              <label>
                Дата рождения
                <input
                  name="birth_date"
                  type="date"
                  defaultValue={d.settings?.birth_date || ""}
                />
              </label>
            </div>

            <div className="grid2">
              <label>
                Рост, см
                <input
                  name="height_cm"
                  type="number"
                  min="100"
                  max="250"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={d.settings?.height_cm || ""}
                />
              </label>
              <label>
                Целевые калории
                <input
                  name="kcal_target"
                  type="number"
                  min="800"
                  max="7000"
                  step="1"
                  inputMode="numeric"
                  defaultValue={d.settings?.kcal_target || 2000}
                />
              </label>
            </div>
          </div>

          <div className="formSection">
            <div className="formSectionTitle">Вес</div>
            <div className="grid2">
              <label>
                Текущий вес, кг
                <input
                  name="current_weight_kg"
                  type="number"
                  min="30"
                  max="400"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={d.settings?.current_weight_kg || d.weights?.[0]?.weight_kg || ""}
                />
              </label>
              <label>
                Целевой вес, кг
                <input
                  name="target_weight_kg"
                  type="number"
                  min="30"
                  max="400"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={d.settings?.target_weight_kg || ""}
                />
              </label>
            </div>
          </div>

          <div className="formSection">
            <div className="formSectionTitle">Целевые БЖУ</div>
            <div className="macroInputs">
              <label>
                Белки, г
                <input
                  name="protein_target"
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={d.settings?.protein_target || ""}
                />
              </label>
              <label>
                Жиры, г
                <input
                  name="fat_target"
                  type="number"
                  min="0"
                  max="500"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={d.settings?.fat_target || ""}
                />
              </label>
              <label>
                Углеводы, г
                <input
                  name="carb_target"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={d.settings?.carb_target || ""}
                />
              </label>
            </div>
          </div>

          <button className="primary saveProfileButton" type="submit">
            Сохранить профиль
          </button>
        </form>
      </section>

      <section className="card top">
        <div className="sectionTitleRow">
          <div>
            <h2>Новое измерение веса</h2>
            <p className="muted sectionSub">Добавляется в историю прогресса</p>
          </div>
        </div>
        <form action="/api/client/weight" method="post" className="quickWeightForm">
          <input
            name="weight_kg"
            type="number"
            min="30"
            max="400"
            step="0.1"
            inputMode="decimal"
            placeholder="Например, 68.4"
            required
          />
          <button className="primary" type="submit">
            Записать
          </button>
        </form>
      </section>

      <section className="card top mobileProfileLogout">
        <h2>Аккаунт</h2>
        <form action="/api/auth/logout" method="post">
          <button className="secondaryDanger" type="submit">
            Выйти из профиля
          </button>
        </form>
      </section>
    </>
  );
}
