# TeddY safe optimization pass

Изменено только безопасное:
- support dialogs polling: 5s -> 12s;
- polling выполняется только когда вкладка видима;
- при возврате во вкладку выполняется мгновенный refresh;
- отправка сообщения/фото по-прежнему обновляет UI сразу.

Не менялись:
- photo recognition;
- Vision;
- commit_meal_draft_v20;
- meals schema;
- subscription logic;
- Telegram ingress routing;
- support persistence/delivery logic.
