"use client";

import { useEffect, useState } from "react";

import { BrushStroke } from "@/components/ui/BrushStroke";
import { fetchArtworkThumbs, loadedArtworkThumbs } from "@/lib/artwork-thumbs";
import { applyCaptionMode, useCaptionMode } from "@/lib/caption-mode";
import { useDictionary } from "@/lib/i18n/client";

/**
 * «Описание · Все работы» вверху колонки подписи на странице работы
 * (заказчик, 20.10.2026, вариант А; на телефоне — 22.10.2026). Во втором
 * режиме на месте описания — сетка миниатюр (ArtworkPicker).
 *
 * Выбранный пункт подчёркнут тем же мазком, что пункт меню: мазок есть
 * у обоих, показывает нужный CSS по атрибуту на `<html>` — так верный
 * пункт виден с первой отрисовки, ещё до гидратации (lib/caption-mode.ts).
 * Мазок заново наносится при каждом переключении: анимация CSS
 * перезапускается, когда элемент снова становится видимым.
 *
 * Число работ — из общего списка, который страница и так грузит для
 * счётчика «12 / 204»: отдельного запроса нет.
 */
export function CaptionTabs() {
  const t = useDictionary().work;
  const mode = useCaptionMode();
  const [count, setCount] = useState(() => loadedArtworkThumbs()?.length ?? null);

  useEffect(() => {
    let isCurrent = true;
    fetchArtworkThumbs()
      .then((works) => {
        if (isCurrent) setCount(works.length);
      })
      .catch(() => {
        // Число — подсказка: без него переключатель работает. Причину
        // пишет в консоль счётчик ArtworkPosition, у них общий запрос.
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div role="group" aria-label={t.captionModes} className="caption-tabs">
      <button
        type="button"
        onClick={() => applyCaptionMode("about")}
        aria-pressed={mode === "about"}
        data-mode="about"
        className="caption-tab"
      >
        <BrushStroke className="caption-tab-stroke" duration={0.6} delay={0} />
        <span className="caption-tab-label">{t.aboutTab}</span>
      </button>
      <button
        type="button"
        onClick={() => applyCaptionMode("works")}
        aria-pressed={mode === "works"}
        data-mode="works"
        className="caption-tab"
      >
        <BrushStroke className="caption-tab-stroke" duration={0.6} delay={0} />
        <span className="caption-tab-label">
          {t.worksTab}
          {count !== null && <span className="caption-tab-count">{count}</span>}
        </span>
      </button>
    </div>
  );
}
