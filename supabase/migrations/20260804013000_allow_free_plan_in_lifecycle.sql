-- Регистрация падала с «Не удалось создать аккаунт».
--
-- Триггер профиля после ввода бесплатного уровня пишет plan='free' и
-- state='free', а ограничения на subscription_lifecycle допускали только
-- basic/premium и trial/active/grace/cancelled/expired. Вставка профиля
-- отклонялась, и вся регистрация возвращала ошибку.
alter table public.subscription_lifecycle drop constraint if exists subscription_lifecycle_plan_chk;
alter table public.subscription_lifecycle drop constraint if exists subscription_lifecycle_state_chk;

alter table public.subscription_lifecycle
  add constraint subscription_lifecycle_plan_chk
  check (plan = any (array['free'::text,'basic'::text,'premium'::text])) not valid;

alter table public.subscription_lifecycle
  add constraint subscription_lifecycle_state_chk
  check (state = any (array['free'::text,'trial'::text,'active'::text,'grace'::text,'cancelled'::text,'expired'::text])) not valid;
