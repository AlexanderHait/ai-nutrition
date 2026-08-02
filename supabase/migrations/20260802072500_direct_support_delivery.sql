-- Support messages are delivered directly by the authenticated Next.js server.
-- The previous database trigger called a combined n8n workflow whose webhook
-- was not registered reliably and produced duplicate/unnecessary executions.

drop trigger if exists trg_support_reply_webhook_v20 on public.support_messages;
drop function if exists public.notify_support_reply_v20();
