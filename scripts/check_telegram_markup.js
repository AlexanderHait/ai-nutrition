#!/usr/bin/env node
// Проверка текста на разметку, из-за которой Telegram отклоняет сообщение целиком.
//
// Узел Telegram в n8n разбирает текст как Markdown даже без явного parse_mode.
// Одиночный «_», «*», «`» или «[» открывает сущность, которая не закрывается,
// и Telegram отвечает «can't parse entities» — человек не получает НИЧЕГО.
// Так 21.08.2026 весь Premium остался без утреннего плана: модель написала
// «(data_quality: low)». Подробности в DECISIONS.md, карточка Д-06.
//
// Использование:
//   node scripts/check_telegram_markup.js "текст"
//   echo "текст" | node scripts/check_telegram_markup.js
//
// Код возврата 1 — текст не дойдёт до пользователя.

// Тот же санитайзер, что стоит в узлах: «~» становится «≈» (смысл «примерно»
// сохраняется), остальные разметочные символы убираются.
const plain = value => String(value || '')
  .replace(/~/g, '≈')
  .replace(/[_*`\[\]]/g, '')
  .replace(/[ \t]{2,}/g, ' ')
  .trim();

const problems = text => {
  const found = [];
  for (const ch of ['_', '*', '`']) {
    const n = (text.match(new RegExp('\\' + ch, 'g')) || []).length;
    if (n % 2) found.push(`непарный «${ch}» (${n} шт.)`);
  }
  const open = (text.match(/\[/g) || []).length;
  const close = (text.match(/\]/g) || []).length;
  if (open !== close) found.push(`непарные скобки ([ ${open}, ] ${close})`);
  // [текст] без «(ссылка)» Telegram тоже считает незакрытой сущностью.
  if (/\[[^\]]*\](?!\()/.test(text)) found.push('«[…]» без ссылки следом');
  return found;
};

const read = () => new Promise(resolve => {
  if (process.argv[2]) return resolve(process.argv.slice(2).join(' '));
  let buf = '';
  process.stdin.on('data', chunk => { buf += chunk; });
  process.stdin.on('end', () => resolve(buf));
});

read().then(text => {
  const found = problems(text);
  if (!found.length) {
    console.log('ок — Telegram доставит этот текст');
    return;
  }
  console.log('НЕ ДОЙДЁТ до пользователя: ' + found.join('; '));
  console.log('\nБезопасный вариант:\n' + plain(text));
  process.exitCode = 1;
});
