-- V17 performance indexes. Safe/additive.
create index if not exists meals_chat_day_active_idx on meals(chat_id,eaten_day,eaten_at desc) where deleted=false;
create index if not exists meals_day_active_idx on meals(eaten_day,eaten_at desc) where deleted=false;
create index if not exists chat_logs_chat_created_idx on chat_logs(chat_id,created_at desc);
create index if not exists support_messages_chat_created_idx on support_messages(chat_id,created_at desc);
create index if not exists support_messages_admin_unread_idx on support_messages(created_at desc) where sender='client' and read_by_admin_at is null;
create index if not exists subscriptions_chat_created_status_idx on subscriptions(chat_id,created_at desc,status);
create index if not exists payment_events_created_status_idx on payment_events(created_at desc,status);
create index if not exists profiles_username_lower_idx on profiles(lower(username));
