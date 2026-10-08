"use client";

import { cn } from "@/lib/cn";
import { useDictionary } from "@/lib/i18n/client";

/**
 * Переключатель зала: почти белый (по умолчанию) и тёмный — тумблер
 * с солнцем и луной.
 *
 * Клиентский по необходимости — он трогает атрибут на `<html>` и
 * localStorage. Больше ничего клиентского темам не нужно: цвета живут
 * в CSS-переменных (app/globals.css, блок «залы»), и смена атрибута
 * перекрашивает страницу сама.
 *
 * Своего состояния у компонента нет — и это не экономия, а требование
 * правильности: выбранный зал уже записан в атрибуте `<html>`, который
 * до отрисовки выставил встроенный скрипт из app/layout.tsx. Держи мы
 * копию в `useState`, сервер отрисовал бы один зал, браузер — настоящий
 * выбор, и React пожаловался бы на расхождение разметки. Поэтому где
 * стоит ползунок, решает CSS по тому же атрибуту (класс `.hall-toggle`).
 * По той же причине подпись кнопки не зависит от зала: «вкл/выкл»
 * в `aria-checked` пришлось бы держать в состоянии.
 */
type Hall = "paper" | "dark";

/** Ключ в localStorage. То же имя читает встроенный скрипт в app/layout.tsx. */
const STORAGE_KEY = "hall";

/**
 * Применяет выбор: атрибут на `<html>` перекрашивает страницу, запись
 * в localStorage переживает перезагрузку.
 *
 * Живёт вне компонента намеренно: правка документа из тела компонента —
 * это правка значения, объявленного снаружи, и линтер правил React-хуков
 * такое запрещает.
 */
function applyHall(value: Hall): void {
  const root = document.documentElement;

  // Тёмный зал в CSS живёт без атрибута, поэтому атрибут снимается,
  // а не ставится (почему так — в app/globals.css, блок «залы»).
  if (value === "dark") delete root.dataset.theme;
  else root.dataset.theme = value;

  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Приватный режим браузера запрещает запись. Тогда выбор просто
    // не переживёт перезагрузку — ронять из-за этого страницу незачем.
  }
}

/** Тёмный зал в CSS — это отсутствие атрибута, светлый — `data-theme="paper"`. */
function currentHall(): Hall {
  return document.documentElement.dataset.theme === "paper" ? "paper" : "dark";
}

export function ThemeSwitch({ className }: { className?: string }) {
  const t = useDictionary();

  return (
    <button
      type="button"
      onClick={() => applyHall(currentHall() === "dark" ? "paper" : "dark")}
      aria-label={t.nav.theme}
      title={t.nav.themeTitle}
      className={cn("hall-toggle", className)}
    >
      <span className="hall-toggle-thumb" aria-hidden="true" />
      <svg className="hall-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
      <svg className="hall-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
