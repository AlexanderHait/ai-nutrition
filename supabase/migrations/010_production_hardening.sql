-- V19 production hardening
create table if not exists telegram_updates_processed(update_id bigint primary key,chat_id bigint,update_kind text,processed_at timestamptz not null default now());
create index if not exists telegram_updates_processed_at_idx on telegram_updates_processed(processed_at desc);
create or replace function claim_telegram_update(_update_id bigint,_chat_id bigint default null,_kind text default null) returns boolean language plpgsql security definer set search_path=public as $$ begin if _update_id is null then return true; end if; insert into telegram_updates_processed(update_id,chat_id,update_kind) values(_update_id,_chat_id,_kind) on conflict(update_id) do nothing; return found; end $$;
grant execute on function claim_telegram_update(bigint,bigint,text) to service_role;
create or replace function cleanup_telegram_update_claims(_older_than interval default interval '14 days') returns integer language plpgsql security definer set search_path=public as $$ declare n integer; begin delete from telegram_updates_processed where processed_at < now()-_older_than; get diagnostics n=row_count; return n; end $$;
grant execute on function cleanup_telegram_update_claims(interval) to service_role;
create index if not exists subscriptions_chat_created_desc_idx on subscriptions(chat_id,created_at desc);
create index if not exists subscriptions_active_premium_idx on subscriptions(chat_id,ends_at) where plan='premium' and status='active';
create index if not exists premium_recommendations_unknown_idx on premium_recommendations(chat_id,created_at desc) where outcome='unknown';
create index if not exists support_messages_client_unread_idx on support_messages(chat_id,created_at desc) where sender='client' and read_by_admin_at is null;
