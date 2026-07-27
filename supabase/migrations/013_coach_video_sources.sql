
-- 013_coach_video_sources.sql
-- Source inventory from the 9 uploaded trainer-channel screen recordings.
-- Claims are intentionally left in draft until human review: the files are screen recordings
-- and not all voice messages can be transcribed reliably offline.

insert into coach_sources(title,source_type,source_ref,author_label,qualification_note,review_status)
values
('Trainer channel clip 01','video','-5074426599758097588(1).MP4','Квалифицированный тренер','Пользователь обозначил автора как квалифицированного тренера','draft'),
('Trainer channel clip 02','video','970474402340444962(1).MP4','Квалифицированный тренер','Темы на экране: питание вне дома, протеиновые батончики, жиры, сахар/подсластители, железо','draft'),
('Trainer channel clip 03','video','-1690293302490819943(1).MP4','Квалифицированный тренер','Тренировочные материалы и разборы','draft'),
('Trainer channel clip 04','video','-9217939517890561517(1).mp4','Квалифицированный тренер','Длинная навигационная запись канала/разделов','draft'),
('Trainer channel clip 05','video','-6264778611039749756(1).MP4','Квалифицированный тренер','Питание + демонстрации упражнений/техники','draft'),
('Trainer channel clip 06','video','5443955897672827882(1).MP4','Квалифицированный тренер','Разборы упражнений, техника и клиентские кейсы','draft'),
('Trainer channel clip 07','video','7599855851895359018(1).MP4','Квалифицированный тренер','Текстовый образовательный пост канала','draft'),
('Trainer channel clip 08','video','7259928740283709851(1).MP4','Квалифицированный тренер','Примеры рационов/блюд и продуктовые подборки','draft'),
('Trainer channel clip 09','video','-1023969293767965661(1).MP4','Квалифицированный тренер','Примеры приёмов пищи, калорийность и разборы еды','draft')
on conflict do nothing;


-- Extracted, visually readable theses from the uploaded channel recordings.
-- Safe process/technique items can be used immediately.
insert into coach_knowledge(source_id,topic,claim,practical_rule,audience,caveat,evidence_level,start_sec,end_sec,tags,approved_for_ai)
select id,'training_technique',
'Для самостоятельной проверки техники полезно снимать упражнение со стороны в ракурсе, похожем на эталонный видеоразбор.',
'Сравнивать углы, положение корпуса, постановку ног, амплитуду и скорость; пересматривать разбор несколько раз.',
'Тренирующиеся самостоятельно',
'Это метод обратной связи тренера из канала; он не заменяет очную оценку при боли/травме.',
'reviewed',4.5,9.0,array['техника','видео','самопроверка'],true
from coach_sources where source_ref='7599855851895359018(1).MP4';

insert into coach_knowledge(source_id,topic,claim,practical_rule,audience,caveat,evidence_level,start_sec,end_sec,tags,approved_for_ai)
select id,'nutrition_flexibility',
'Готовые списки продуктов и примеры завтраков/обедов/ужинов в канале подаются как ориентиры, а не как жёсткий список разрешённой еды.',
'Использовать шаблоны как удобные варианты, но подбирать рацион под КБЖУ, предпочтения и реальную жизнь клиента.',
'Клиенты по питанию',
'Формулировка отражает методику автора канала.',
'reviewed',29.0,34.0,array['рацион','гибкость','продукты'],true
from coach_sources where source_ref='7259928740283709851(1).MP4';

insert into coach_knowledge(source_id,topic,claim,practical_rule,audience,caveat,evidence_level,start_sec,end_sec,tags,approved_for_ai)
select id,'sugar',
'Свободные сахара рекомендуется держать ниже 10% суточной энергии; снижение к 5% может дать дополнительную пользу.',
'При необходимости переводить процент в граммы под текущую калорийность, не смешивая свободные сахара с целыми фруктами.',
'Взрослые без специальных медицинских ограничений',
'Тезис из канала дополнительно сверён с актуальным WHO Healthy diet guidance; WHO использует термин free sugars.',
'verified',23.0,27.0,array['сахар','сладкое','кбжу'],true
from coach_sources where source_ref='970474402340444962(1).MP4';

insert into coach_knowledge(source_id,topic,claim,practical_rule,audience,caveat,evidence_level,start_sec,end_sec,tags,approved_for_ai)
select id,'baseline_method',
'В методике автора канала работу с целью предлагается начинать с расчёта поддерживающей калорийности, а затем корректировать стратегию.',
'Использовать поддержание как исходную точку наблюдения, особенно когда прежний рацион клиента неизвестен.',
'Клиенты на снижение/набор',
'Это методический подход конкретного тренера, а не универсальное обязательное правило. Нужна индивидуальная адаптация.',
'source_claim',37.0,42.0,array['поддержание','дефицит','профицит','стратегия'],false
from coach_sources where source_ref='7259928740283709851(1).MP4';

insert into coach_knowledge(source_id,topic,claim,practical_rule,audience,caveat,evidence_level,start_sec,end_sec,tags,approved_for_ai)
select id,'education_topics',
'Канал системно разбирает практические вопросы: подсчёт КБЖУ, размер и распределение приёмов, еду на ночь, рестораны, воду, батончики, глютен, хлеб/макароны/картофель, молочные продукты, сахар, жиры, отёки и добавки.',
'Использовать эти темы как рубрикатор базы знаний и FAQ, а не как готовые ответы без просмотра исходного материала.',
'Все клиенты',
'На записи видны названия тем/голосовых сообщений; содержание каждого голосового отдельно не транскрибировано.',
'source_claim',1.0,18.0,array['faq','темы','питание'],false
from coach_sources where source_ref='970474402340444962(1).MP4';
