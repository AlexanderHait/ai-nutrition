-- Скрытие уведомлений в личном кабинете.
--
-- Уведомления не хранятся в базе, они каждый раз считаются заново из данных.
-- Поэтому «удалить» нельзя буквально — можно только запомнить, что человек
-- это уже видел и закрыл.
--
-- Правило возврата намеренно консервативное: уведомление скрыто, пока его
-- текст совпадает с тем, что было закрыто (signature), и не прошло 30 дней.
-- Если цифры изменились — это уже другой сигнал, и он показывается снова.
-- Так закрытое предупреждение о весе или недоборе калорий не пропадает
-- навсегда: молчать о настоящей проблеме хуже, чем показать её второй раз.

create table if not exists public.client_notice_dismissals (
  id bigserial primary key,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  notice_id text not null,
  signature text not null,
  dismissed_at timestamptz not null default now(),
  unique (account_id, notice_id)
);

create index if not exists client_notice_dismissals_account_idx
  on public.client_notice_dismissals (account_id, dismissed_at desc);

-- Как и остальные таблицы проекта: доступ только через service_role.
alter table public.client_notice_dismissals enable row level security;
