"use client";

import { applyCaptionMode, useCaptionMode } from "@/lib/caption-mode";
import { useDictionary } from "@/lib/i18n/client";

/**
 * Значок «Все работы» рядом со стрелками «‹ 3 / 32 ›». Прежде открывал
 * панель поверх страницы, теперь переключает колонку подписи: сетка
 * работ на месте описания и обратно — то же, что «Описание · Все работы»
 * вверху колонки (CaptionTabs). Нажатое состояние рисует CSS по атрибуту
 * на `<html>` (globals.css, `.works-toggle`), `aria-pressed` — для
 * скринридера.
 */
export function WorksToggle() {
  const t = useDictionary().work;
  const mode = useCaptionMode();

  return (
    <button
      type="button"
      onClick={() => applyCaptionMode(mode === "works" ? "about" : "works")}
      aria-pressed={mode === "works"}
      aria-label={t.worksToggle}
      title={t.worksTab}
      className="works-toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
      </svg>
    </button>
  );
}
