"use client";

import Image from "next/image";
import { memo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary } from "@/lib/i18n/client";

/**
 * Сдвиг миниатюр вбок в столбике на компьютере, по кругу. Неровный край,
 * как у образца заказчика (gregorcollienne.com/focus) и у коллажа в
 * галерее: ровный столбик выглядел бы полосой прокрутки, а не стеной.
 */
const shifts = [0, 10, 46, 54, 12, 0, 32, 6, 40, 18, 0, 50];

type ThumbStyle = CSSProperties & { "--ratio": number; "--shift": string };

/**
 * Миниатюры всех работ рядом с лентой на странице работы (заказчик,
 * 22.10.2026). Разметка одна, раскладку меняет CSS (globals.css,
 * «Лента работ»): на компьютере — столбик слева со сдвигами, на телефоне —
 * полоса внизу экрана. Миниатюра — в пропорциях картины, а не квадратом:
 * по силуэту холста его узнают быстрее, чем по обрезанному кусочку.
 *
 * Нажатие не переходит на другую страницу, а доводит ленту до картины —
 * адрес лента меняет сама (ArtworkFeed). Текущая обведена, и список сам
 * подкручивается, чтобы она стояла посередине.
 */
export function FeedThumbs({
  works,
  current,
  onPick,
}: {
  works: readonly ArtworkFeedItem[];
  current: number;
  onPick: (index: number) => void;
}) {
  const t = useDictionary().work;
  const listRef = useRef<HTMLOListElement>(null);
  const hasScrolled = useRef(false);

  // Прокручивается сам список, без scrollIntoView: тот двигал бы и
  // страницу — на телефоне её бы утягивало вниз к полосе миниатюр.
  // Первый раз — сразу, дальше — плавно, вслед за лентой.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelectorAll<HTMLElement>(":scope > li")[current];
    if (!list || !item) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2,
      top: item.offsetTop - (list.clientHeight - item.offsetHeight) / 2,
      behavior: hasScrolled.current && !calm ? "smooth" : "auto",
    });
    hasScrolled.current = true;
  }, [current, works.length]);

  return (
    <nav aria-label={t.navLabel} className="feed-thumbs">
      <ol ref={listRef} className="feed-thumbs-list">
        {works.map((work, index) => (
          <Thumb
            key={work.id}
            work={work}
            index={index}
            isCurrent={index === current}
            label={`${work.title}. ${t.position(index + 1, works.length)}`}
            onPick={onPick}
          />
        ))}
      </ol>
    </nav>
  );
}

/**
 * Одна миниатюра. Под `memo`: при смене картины перерисовываются две —
 * прежняя текущая и новая, а не все двести (ArtworkFeed, FeedSlide —
 * там же причина: перерисовка всех останавливала листание).
 */
const Thumb = memo(function Thumb({
  work,
  index,
  isCurrent,
  label,
  onPick,
}: {
  work: ArtworkFeedItem;
  index: number;
  isCurrent: boolean;
  label: string;
  onPick: (index: number) => void;
}) {
  const style: ThumbStyle = {
    "--ratio": work.ratio ?? 1,
    "--shift": `${shifts[index % shifts.length]}px`,
  };
  return (
    // data-current — для CSS: на компьютере текущая выдвинута
    // из столбика (globals.css), сдвиг задаётся у строки списка.
    <li style={style} data-current={isCurrent || undefined}>
      <button
        type="button"
        onClick={() => onPick(index)}
        aria-current={isCurrent ? "true" : undefined}
        aria-label={label}
        title={work.title}
        className="feed-thumb"
      >
        {work.src ? (
          <Image src={work.src} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <span className="feed-thumb-empty">{work.title}</span>
        )}
      </button>
    </li>
  );
});
