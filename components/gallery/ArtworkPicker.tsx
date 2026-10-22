"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ArtworkThumb } from "@/lib/artworks";
import { fetchArtworkThumbs, loadedArtworkThumbs } from "@/lib/artwork-thumbs";
import { useCaptionMode } from "@/lib/caption-mode";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/** Сколько серых плиток показать, пока список грузится: пять рядов по три. */
const placeholderCount = 15;

/**
 * «Все работы» на месте описания (заказчик: 20.10.2026 — компьютер,
 * 22.10.2026 — телефон). Сменила панель поверх страницы: та закрывала
 * картину, и выбранная работа терялась под ней; на телефоне она ещё и
 * была тёмной, чужой странице.
 *
 * Разметка одна, раскладку меняет CSS (globals.css, `.works-grid`):
 * на компьютере — три столбца в левой колонке, с прокруткой внутри неё;
 * на экранах меньше 1024px — лента в два ряда под картиной, листается
 * вбок. Видна
 * сетка, только когда выбран режим «Все работы» (lib/caption-mode.ts).
 *
 * Список — общий файл `/api/artwork-thumbs`: страница грузит его и так,
 * для счётчика «12 / 204». Выбор — обычная ссылка: адрес у каждой
 * картины свой, «назад» вернёт к прежней. Миниатюры грузятся только
 * видимые (`loading="lazy"` у next/image); пока сетка спрятана, не
 * грузится ни одна.
 */
export function ArtworkPicker({ currentId }: { currentId: string | null }) {
  const t = useDictionary().work;
  const lang = useLocale();
  const mode = useCaptionMode();
  const listRef = useRef<HTMLUListElement>(null);
  const [works, setWorks] = useState<ArtworkThumb[] | null>(loadedArtworkThumbs);
  const [hasFailed, setHasFailed] = useState(false);
  // Номер попытки: «Попробовать ещё раз» увеличивает его и запускает
  // загрузку заново. Уже загруженный список модуль отдаёт без запроса.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    fetchArtworkThumbs()
      .then((list) => {
        if (isCurrent) setWorks(list);
      })
      .catch((error: unknown) => {
        // Без списка сетка пуста, но страница цела: пишем, что не вышло,
        // и даём повторить — а в консоль уходит причина.
        console.error(error);
        if (isCurrent) setHasFailed(true);
      });
    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  function retry(): void {
    setHasFailed(false);
    setAttempt((value) => value + 1);
  }

  // Текущая работа — сразу на виду, а не где-то на сотой позиции. Сетка
  // прокручивается сама по себе, без scrollIntoView: тот двигал бы и
  // страницу, и на телефоне она уезжала бы вниз к ленте сразу при входе.
  // Пока сетка спрятана, размеров у неё нет — ждём, когда её покажут.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>("[aria-current]");
    if (mode !== "works" || !list || !item) return;
    list.scrollTo({
      left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2,
      top: item.offsetTop - (list.clientHeight - item.offsetHeight) / 2,
    });
  }, [mode, works]);

  if (hasFailed) {
    return (
      <p className="works-error">
        {t.pickerError}{" "}
        <button type="button" onClick={retry} className="works-retry">
          {t.pickerRetry}
        </button>
      </p>
    );
  }

  return (
    <ul ref={listRef} aria-label={t.worksTab} aria-busy={works === null} className="works-grid">
      {works === null
        ? Array.from({ length: placeholderCount }, (_, index) => (
            <li key={index} aria-hidden>
              <span className="works-thumb works-thumb-loading" />
            </li>
          ))
        : works.map((work) => (
            <li key={work.id}>
              <Link
                href={localePath(lang, `/gallery/${work.id}`)}
                // Без заранее-загрузки, как у плиток стены (ArtworkTile):
                // иначе видимая сетка запрашивала бы страницы всех миниатюр разом.
                prefetch={false}
                aria-current={work.id === currentId ? "page" : undefined}
                title={work.title}
                className="works-thumb"
              >
                {work.src ? (
                  <Image
                    src={work.src}
                    alt={work.title}
                    fill
                    sizes="(min-width: 1024px) 104px, 96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="works-thumb-empty">{work.title}</span>
                )}
              </Link>
            </li>
          ))}
    </ul>
  );
}
