"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const STORAGE_KEY = "teddy-theme";

// Цвет строки браузера на телефоне должен совпадать с выбранной темой,
// иначе при светлой теме шапка остаётся тёмной.
const BROWSER_BAR: Record<Theme, string> = {
  light: "#f2f5f2",
  dark: "#0d1716",
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = BROWSER_BAR[theme];
}

export default function ThemeToggle() {
  // Тему на первом кадре ставит скрипт в <head>, поэтому здесь только
  // подхватываем уже выставленное значение — без мигания и прыжка.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current);
    applyTheme(current);

    // Если человек не выбирал тему вручную, следуем за системной.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (event: MediaQueryListEvent) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {
        saved = null;
      }
      if (saved === "light" || saved === "dark") return;
      const next: Theme = event.matches ? "dark" : "light";
      setTheme(next);
      applyTheme(next);
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onSystemChange);
      return () => media.removeEventListener("change", onSystemChange);
    }

    // Older Android WebView and Samsung Internet only expose this API.
    media.addListener(onSystemChange);
    return () => media.removeListener(onSystemChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Приватный режим — тема просто не запомнится.
    }
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={toggle}
      aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      aria-pressed={!dark}
    >
      {dark ? <Sun size={19} strokeWidth={2} /> : <Moon size={19} strokeWidth={2} />}
    </button>
  );
}
