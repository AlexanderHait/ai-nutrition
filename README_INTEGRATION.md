# TeddY Support Media Patch

Патч для раздела «Диалоги» (Next.js / Vercel).

Что добавляет:
- кнопку 📎 рядом с полем ответа;
- выбор JPG/PNG/WEBP/HEIC/HEIF до 10 МБ;
- компактный preview перед отправкой;
- загрузку оригинала в приватный Supabase Storage bucket `support-media`;
- запись `attachment_path`, `attachment_mime`, `attachment_name`, `attachment_size` в существующий `support_messages`;
- отображение клиентских и админских фото в истории;
- signed URL вместо публичного bucket;
- lightbox по клику на изображение;
- текст + фото одним сообщением;
- никаких base64 в БД.

## Важно

Backend Supabase уже подготовлен:
- bucket: `support-media` (PRIVATE);
- `support_messages.attachment_path`;
- `support_messages.attachment_mime`;
- `support_messages.attachment_name`;
- `support_messages.attachment_size`.

Никакой SQL из этого архива запускать не требуется.

## Environment

Server-side должны быть доступны:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

Можно также использовать уже существующие имена env в проекте.
Не выносить SERVICE_ROLE в `NEXT_PUBLIC_*`.

## Куда добавить

1. Скопировать:
   - `components/support/SupportComposer.tsx`
   - `components/support/SupportAttachment.tsx`
   - `components/support/SupportMessageBody.tsx`
   - `app/api/support/send/route.ts`
   - `app/api/support/media/signed-url/route.ts`
   - `lib/support-types.ts`

2. На странице «Диалоги» заменить текущую нижнюю форму:
   textarea + «Отправить»
   на `<SupportComposer chatId={selectedChatId} onSent={reloadMessages} />`.

3. В рендере каждой записи `support_messages` вместо одного `message.content`
   использовать:

```tsx
<SupportMessageBody message={message} />
```

4. Запрос сообщений должен возвращать дополнительные поля:
   - attachment_path
   - attachment_mime
   - attachment_name
   - attachment_size

## Пример интеграции

```tsx
import { SupportComposer } from "@/components/support/SupportComposer";
import { SupportMessageBody } from "@/components/support/SupportMessageBody";

...

{messages.map((message) => (
  <div key={message.id} className={message.sender === "admin" ? "..." : "..."}>
    <SupportMessageBody message={message} />
  </div>
))}

<SupportComposer
  chatId={selectedChatId}
  onSent={() => loadMessages(selectedChatId)}
/>
```

## UX

Нижняя панель:

[ 📎 ] [ Ответить клиенту...                         ] [ Отправить ]

После выбора файла:
- preview над полем;
- имя + размер;
- × для удаления;
- поле остаётся доступным для подписи;
- кнопка «Отправить» работает и с фото без текста.

Изображение в истории:
- max width примерно 360px;
- border-radius 12px;
- object-fit cover;
- клик открывает lightbox;
- signed URL живёт 10 минут.

## Что НЕ делать

- не делать bucket публичным;
- не класть base64 в `support_messages`;
- не хранить Telegram file_id как основной файл платформы;
- не использовать клиентский service_role;
- не делать polling.

## Отправка клиенту в Telegram

Сам insert `sender='admin'` уже вызывает существующую event-driven доставку.
Для текста текущая доставка работает.

Для фото в Telegram нужно обновить n8n `Support Reply Delivery` до версии,
которая читает `attachment_path` и при наличии вложения отправляет Telegram `sendPhoto`.
Это отдельный n8n patch, не frontend.
