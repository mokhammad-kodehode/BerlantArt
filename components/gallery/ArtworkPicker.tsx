"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ArtworkThumb } from "@/lib/artworks";
import { fetchArtworkThumbs } from "@/lib/artwork-thumbs";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/** Сколько серых плиток показать, пока список грузится: две колонки ленты. */
const placeholderCount = 20;

/**
 * Кнопка «Все работы» и панель с миниатюрами поверх страницы работы
 * (заказчик, 12.10.2026): выбрать другую картину, не возвращаясь в
 * галерею. Заменила секцию «Другие работы» внизу страницы — та показывала
 * четыре случайные по порядку работы и требовала прокрутки.
 *
 * Список работ грузится, только когда панель открыли, одним общим файлом
 * на весь сайт. До 21.10.2026 он был зашит в каждую страницу работы — на
 * 203 работах это делало каждую страницу в разы тяжелее, а Vercel считает
 * записи в кеш по 8 КБ (lib/revalidate.ts). Загруженный список живёт,
 * пока открыта эта страница; при переходе к соседней работе браузер
 * берёт его из своего кеша.
 *
 * Панель — в два ряда, листается вбок, как лента в примерочной. Выбор —
 * обычная ссылка: адрес у каждой картины свой, страница не перезагружается
 * (переход внутри приложения), «назад» вернёт к прежней работе.
 *
 * Окно — встроенный `<dialog>`: Esc, ловушка фокуса и возврат фокуса на
 * кнопку браузер делает сам. Миниатюры грузятся только видимые в ленте
 * (`loading="lazy"` у next/image).
 */
export function ArtworkPicker({ currentId }: { currentId: string }) {
  const t = useDictionary().work;
  const lang = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLUListElement>(null);
  const [works, setWorks] = useState<ArtworkThumb[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  async function load(): Promise<void> {
    setHasFailed(false);
    try {
      // Тот же запрос, что у счётчика «129 / 203» (lib/artwork-thumbs.ts):
      // к открытию панели список обычно уже загружен.
      setWorks(await fetchArtworkThumbs());
    } catch (error) {
      // Без списка панель бесполезна, но страница цела: пишем, что не
      // вышло, и даём повторить — а в консоль уходит причина.
      console.error(error);
      setHasFailed(true);
    }
  }

  function open(): void {
    dialogRef.current?.showModal();
    if (works === null) void load();
    else scrollToCurrent();
  }

  function close(): void {
    dialogRef.current?.close();
  }

  function scrollToCurrent(): void {
    // Текущая работа — сразу на виду, а не где-то на сотой позиции.
    stripRef.current
      ?.querySelector("[aria-current]")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  // Список пришёл, пока панель открыта, — подвести ленту к текущей работе.
  useEffect(() => {
    if (works === null || !dialogRef.current?.open) return;
    stripRef.current
      ?.querySelector("[aria-current]")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [works]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={t.pickerOpen}
        title={t.pickerOpen}
        className="stage-picker-button"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={t.pickerOpen}
        // Клик по затемнению рядом с панелью приходит в само окно.
        onClick={(event) => event.target === event.currentTarget && close()}
        className="picker"
      >
        <div className="picker-head">
          <p className="m-0">{works === null ? t.pickerOpen : t.pickerTitle(works.length)}</p>
          <button
            type="button"
            onClick={close}
            aria-label={t.pickerClose}
            title={t.pickerClose}
            className="picker-close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {hasFailed ? (
          <p className="picker-error">
            {t.pickerError}{" "}
            <button type="button" onClick={() => void load()} className="picker-retry">
              {t.pickerRetry}
            </button>
          </p>
        ) : (
          <ul ref={stripRef} className="picker-strip" aria-busy={works === null}>
            {works === null
              ? Array.from({ length: placeholderCount }, (_, index) => (
                  <li key={index} aria-hidden>
                    <span className="picker-thumb picker-thumb-loading" />
                  </li>
                ))
              : works.map((work) => (
                  <li key={work.id}>
                    <Link
                      href={localePath(lang, `/gallery/${work.id}`)}
                      // Без заранее-загрузки, как у плиток стены (ArtworkTile):
                      // иначе открытая лента запрашивала бы страницы всех
                      // видимых миниатюр разом.
                      prefetch={false}
                      onClick={close}
                      aria-current={work.id === currentId ? "page" : undefined}
                      title={work.title}
                      className="picker-thumb"
                    >
                      {work.src ? (
                        <Image
                          src={work.src}
                          alt={work.title}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="picker-thumb-empty">{work.title}</span>
                      )}
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </dialog>
    </>
  );
}
