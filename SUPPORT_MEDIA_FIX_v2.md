# Support Media / Delivery v2

- support media remains persisted in private `support-media`;
- `support_messages.attachment_path` remains the source of truth;
- admin send endpoint no longer invokes n8n directly;
- Telegram delivery happens only through the Supabase support_messages INSERT trigger;
- this prevents duplicate Support_Reply_Delivery executions.
