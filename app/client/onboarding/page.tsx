import Link from "next/link";
import { Crown, Sparkles } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientOnboardingData } from "@/lib/data";
import { subscriptionAccess } from "@/lib/subscription-access";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requireClient();
  const access = await subscriptionAccess(auth.chatId!);
  if (!access.premium) {
    return (
      <>
        <div className="pageHead">
          <div><p>Premium · TeddY Coach</p><h1>Настройки Coach</h1><span>Персонализация доступна в Premium и во время trial.</span></div>
        </div>
        <section className="premiumLockHero">
          <Crown />
          <h2>TeddY Premium</h2>
          <p>Настройки бюджета, любимых продуктов, тренировочных дней и формата рекомендаций.</p>
          <Link className="primary" href="/client/plan">Посмотреть Premium</Link>
        </section>
      </>
    );
  }

  const data = await clientOnboardingData(auth.chatId!);
  const onboarding: any = data.onboarding || {};
  return (
    <>
      <div className="pageHead">
        <div><p>Premium · TeddY Coach</p><h1>Настройки Coach</h1><span>Эти параметры помогают Coach давать рекомендации под твой ритм, бюджет и привычки.</span></div>
        <Crown />
      </div>
      <form className="card onboardingForm" action="/api/premium/onboarding" method="post">
        <div className="onboardingGrid">
          <label>Бюджет на питание<select name="budget_level" defaultValue={onboarding.budget_level || "medium"}><option value="low">Экономно</option><option value="medium">Обычно</option><option value="high">Без жёстких ограничений</option></select></label>
          <label>Сколько готовки комфортно<select name="cooking_time" defaultValue={onboarding.cooking_time || "normal"}><option value="minimal">Почти без готовки</option><option value="normal">15–30 минут</option><option value="long">Могу готовить долго</option></select></label>
          <label>Удобное число приёмов<select name="meals_per_day" defaultValue={String(onboarding.meals_per_day || 3)}><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
          <label>Частота подсказок<select name="notification_level" defaultValue={onboarding.notification_level || "normal"}><option value="minimal">Минимум</option><option value="normal">Обычно</option><option value="active">Активно</option></select></label>
          <label>Формат ответов<select name="response_detail" defaultValue={onboarding.response_detail || "medium"}><option value="short">Коротко</option><option value="medium">Обычно</option><option value="detailed">Подробно</option></select></label>
        </div>
        <label>Любимые продукты / блюда<input name="preferred_foods" defaultValue={(onboarding.preferred_foods || []).join(", ")} placeholder="рис, курица, творог, паста" /></label>
        <label>Не люблю / не хочу видеть в рекомендациях<input name="disliked_foods" defaultValue={(onboarding.disliked_foods || []).join(", ")} placeholder="овсянка, рыба..." /></label>
        <label>Тренировочные дни<input name="training_days" defaultValue={(onboarding.training_days || []).join(", ")} placeholder="пн, ср, сб" /></label>
        <button className="primary" type="submit"><Sparkles size={16} />Сохранить персонализацию</button>
      </form>
    </>
  );
}
