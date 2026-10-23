"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { filterFittingWorks, fittingCategories, type FittingWork } from "@/lib/fitting-works";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { canvasCmText } from "@/lib/room-options";

/** Миниатюра вписана в квадрат: длинная сторона — столько пикселей. */
const thumbSide = 84;

/** Столько миниатюр видно сразу, без прокрутки (два ряда по три): их не откладываем. */
const eagerThumbs = 6;

/**
 * Столько курсор должен простоять на работе, чтобы она повисла на стене.
 * Без этого картина вешалась при любом касании миниатюры курсором, и по
 * пути из списка к стене на ней мелькали случайные работы (заказчик,
 * 23.10.2026; запись: три картины за 0,7 с). Счёт идёт от остановки, а не
 * от входа в миниатюру: «пробыл на ней 150 мс» медленный курсор набирал
 * и на ходу — одна картина всё равно мелькала.
 */
const previewDelay = 150;

/**
 * Выбор картины в панели примерочной («Повесить у себя», заказчик,
 * 23.10.2026): поиск, категории и сетка работ. Один и тот же список
 * открывается сразу, когда пришли из меню, и по «Сменить», когда пришли
 * со страницы работы, — отдельной страницы со списком нет, картина
 * меняется на месте.
 *
 * Курсор, остановившийся на работе (и фокус с клавиатуры), вешает её на
 * стену заранее, до нажатия: так выбирают глазами, а не по названиям.
 * Курсор, проходящий через миниатюры, ничего не вешает. На телефоне
 * наведения нет — касание сразу выбирает.
 */
export function WorkPicker({
  works,
  isFailed,
  current,
  frameLabel,
  onPick,
  onPreview,
  onKeep,
}: {
  /** null — список ещё грузится. */
  works: FittingWork[] | null;
  isFailed: boolean;
  /** Картина, что сейчас на стене; null — ещё ничего не выбрано. */
  current: FittingWork | null;
  /** Выбранная рама — она сохранится при смене картины. */
  frameLabel: string;
  onPick: (work: FittingWork) => void;
  onPreview: (work: FittingWork | null) => void;
  /** Закрыть список и оставить прежнюю картину. */
  onKeep: () => void;
}) {
  const t = useDictionary().room;
  const lang = useLocale();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const categories = useMemo(() => fittingCategories(works ?? [], lang), [works, lang]);
  const shown = useMemo(
    () => filterFittingWorks(works ?? [], { category, query }),
    [works, category, query],
  );

  // Таймер до показа: каждое движение курсора начинает счёт заново.
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(previewTimer.current), []);

  function aimAt(work: FittingWork, event: PointerEvent<HTMLButtonElement>): void {
    // Только настоящее движение мыши: касание сразу выбирает, а миниатюра,
    // въехавшая под неподвижный курсор при прокрутке, — не выбор.
    if (event.pointerType !== "mouse") return;
    if (event.movementX === 0 && event.movementY === 0) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => onPreview(work), previewDelay);
  }

  // Курсор ушёл с миниатюры раньше срока — показ отменяется. Уже
  // повешенная работа остаётся до следующей: между миниатюрами стена не
  // мигает пустотой.
  function stopAiming(): void {
    clearTimeout(previewTimer.current);
  }

  function leaveList(): void {
    stopAiming();
    onPreview(null);
  }

  return (
    <section className="pick" aria-label={current === null ? t.pickWork : t.changeTitle}>
      <div className="pick-head">
        {current !== null && (
          <div className="pick-change">
            <h2 className="pick-title">{t.changeTitle}</h2>
            <button
              type="button"
              className="pick-keep"
              aria-label={t.keepWork(current.title)}
              onClick={onKeep}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
        <p className="pick-lead">{current === null ? t.pickLead : t.keepFrame(frameLabel)}</p>
        <label className="pick-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[17px] flex-none">
            <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </g>
          </svg>
          <input
            type="search"
            value={query}
            placeholder={t.search}
            aria-label={t.searchLabel}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {categories.length > 0 && (
          <div className="pick-chips" role="group" aria-label={t.categories}>
            {[{ key: null, label: t.allCategories }, ...categories].map((item) => (
              <button
                key={item.key ?? ""}
                type="button"
                className="pick-chip"
                aria-pressed={item.key === category}
                onClick={() => setCategory(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {works === null ? (
        <p className="pick-note" role={isFailed ? "alert" : "status"}>
          {isFailed ? t.listFailed : t.listLoading}
        </p>
      ) : shown.length === 0 ? (
        <p className="pick-note">{t.noMatches}</p>
      ) : (
        <ul className="pick-grid" onPointerLeave={leaveList}>
          {shown.map((work, index) => {
            const size = canvasCmText(work.canvas, t.cm);
            const isCurrent = work.id === current?.id;
            // Холст и фото одной формы (lib/artworks.ts, canvasCm), так что
            // пропорции миниатюры — по холсту.
            const ratio = work.canvas.width / work.canvas.height;
            const width = Math.round(ratio >= 1 ? thumbSide : thumbSide * ratio);
            const height = Math.round(ratio >= 1 ? thumbSide / ratio : thumbSide);
            return (
              <li key={work.id}>
                <button
                  type="button"
                  className="pick-cell"
                  aria-current={isCurrent || undefined}
                  aria-label={t.workOption(work.title, size)}
                  onClick={() => onPick(work)}
                  onPointerMove={(event) => aimAt(work, event)}
                  onPointerLeave={stopAiming}
                  // С клавиатуры — сразу: Tab и так шаг за шагом. Фокус от
                  // нажатия мышью не в счёт — нажатие и так выбирает.
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) onPreview(work);
                  }}
                >
                  <span className="pick-box">
                    <span className="pick-art" style={{ width, height }}>
                      <Image
                        src={work.src}
                        alt=""
                        fill
                        sizes={`${width}px`}
                        loading={index < eagerThumbs ? "eager" : "lazy"}
                        className="object-cover"
                      />
                    </span>
                    {isCurrent && <span className="pick-now">{t.current}</span>}
                  </span>
                  <span className="pick-name">{work.title}</span>
                  <span className="pick-size">{size}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
