"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import type { ArtworkThumb } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/**
 * Кнопка «Все работы» и панель с миниатюрами поверх страницы работы
 * (заказчик, 12.10.2026): выбрать другую картину, не возвращаясь в
 * галерею. Заменила секцию «Другие работы» внизу страницы — та показывала
 * четыре случайные по порядку работы и требовала прокрутки.
 *
 * Панель — в два ряда, листается вбок, как лента в примерочной. Выбор —
 * обычная ссылка: адрес у каждой картины свой, страница не перезагружается
 * (переход внутри приложения), «назад» вернёт к прежней работе.
 *
 * Окно — встроенный `<dialog>`: Esc, ловушка фокуса и возврат фокуса на
 * кнопку браузер делает сам. Закрытое окно скрыто, и миниатюры внутри
 * не грузятся, пока его не откроют; открытое грузит только те, что
 * видны в ленте (`loading="lazy"` у next/image).
 */
export function ArtworkPicker({ works, currentId }: { works: ArtworkThumb[]; currentId: string }) {
  const t = useDictionary().work;
  const lang = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLUListElement>(null);

  function open(): void {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Текущая работа — сразу на виду, а не где-то на сотой позиции.
    stripRef.current
      ?.querySelector("[aria-current]")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function close(): void {
    dialogRef.current?.close();
  }

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
          <p className="m-0">{t.pickerTitle(works.length)}</p>
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
        <ul ref={stripRef} className="picker-strip">
          {works.map((work) => (
            <li key={work.id}>
              <Link
                href={localePath(lang, `/gallery/${work.id}`)}
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
      </dialog>
    </>
  );
}
