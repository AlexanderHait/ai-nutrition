// Детерминированное чтение штрих-кода с фото — 11.08.2026
//
// Зрение читает ЦИФРЫ под кодом и потому нередко их не видит вовсе.
// Декодер читает сами ПОЛОСЫ: быстрее в двести раз, бесплатно и без выдумок.
// Замер: чистый код 85 мс, наклон 12° с расфокусом 70 мс.
//
// Принимает либо сырое тело картинки, либо JSON {image_base64}.
// Возвращает только коды с верной контрольной цифрой GTIN и долю кадра,
// которую занимает код: по ней бот решает, снимали код или он просто попал
// в кадр рядом с тарелкой.
import { readBarcodes } from 'npm:zxing-wasm@2.1.0/reader';

type Pt = { x: number; y: number };

function gtinValid(value: string): boolean {
  const d = String(value ?? '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(d.length)) return false;
  const n = d.split('').map(Number);
  const check = n.pop() as number;
  let sum = 0;
  for (let i = n.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += n[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}

// Размеры кадра нужны только для доли площади. Telegram присылает JPEG,
// но PNG тоже разбираем. Формат неизвестен — доля остаётся null, и бот
// в этом случае короткий путь не включает: отказ в безопасную сторону.
function imageSize(b: Uint8Array): { w: number; h: number } | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
    const dv = new DataView(b.buffer, b.byteOffset);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
                    (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isSof) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
  }
  return null;
}

function quadArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

Deno.serve(async (req: Request) => {
  const started = Date.now();
  try {
    if (req.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, started);
    }

    const ct = req.headers.get('content-type') || '';
    let bytes: Uint8Array;
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const b64 = String(body?.image_base64 || '');
      if (!b64) return json({ ok: false, error: 'no_image' }, 400, started);
      bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } else {
      bytes = new Uint8Array(await req.arrayBuffer());
    }
    if (!bytes.length) return json({ ok: false, error: 'no_image' }, 400, started);
    if (bytes.length > 12 * 1024 * 1024) return json({ ok: false, error: 'too_large' }, 413, started);

    const size = imageSize(bytes);
    const results = await readBarcodes(new Blob([bytes]), {
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'],
    });

    const frame = size ? size.w * size.h : 0;
    const codes = results
      .map((r) => {
        const text = String(r.text || '').replace(/\D/g, '');
        const pos = r.position;
        const pts: Pt[] = pos
          ? [pos.topLeft, pos.topRight, pos.bottomRight, pos.bottomLeft].filter(Boolean) as Pt[]
          : [];
        const ratio = frame > 0 && pts.length === 4
          ? Math.min(1, Math.round((quadArea(pts) / frame) * 1000) / 1000)
          : null;
        return { code: text, format: String(r.format || ''), area_ratio: ratio, valid: gtinValid(text) };
      })
      .filter((c) => c.valid);

    // Самый крупный код в кадре — тот, который снимали.
    codes.sort((a, b) => (b.area_ratio ?? 0) - (a.area_ratio ?? 0));
    const best = codes[0] || null;

    return json({
      ok: true,
      code: best?.code ?? null,
      format: best?.format ?? null,
      area_ratio: best?.area_ratio ?? null,
      codes_found: codes.length,
      image_width: size?.w ?? null,
      image_height: size?.h ?? null,
      image_bytes: bytes.length,
    }, 200, started);
  } catch (e) {
    // Любая поломка — это «кода нет». Фото пойдёт обычным путём через зрение.
    return json({ ok: false, error: String((e as Error)?.message || e) }, 200, started);
  }
});

function json(payload: Record<string, unknown>, status: number, started: number) {
  return new Response(JSON.stringify({ ...payload, decode_ms: Date.now() - started }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
