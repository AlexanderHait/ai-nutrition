# Support Media Persistence v1

Исправления:
- support API использует общий `getSupabaseAdmin()` проекта;
- отдельный `SUPABASE_URL` больше не нужен;
- фото очищается из формы только после подтверждённого `support_messages INSERT`;
- `attachment_path` остаётся постоянным в БД;
- файл остаётся в приватном bucket `support-media`;
- клиентская web-поддержка тоже умеет прикреплять фото;
- signed URL защищён сессией;
- клиент может открыть только файлы своего chat_id;
- список диалогов показывает 📷 для обращений с фото.

Требуемые Vercel env:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SESSION_SECRET
- TEDDY_SUPPORT_REPLY_WEBHOOK (опционально; есть production fallback)

`SUPABASE_URL` больше не требуется для support API.
