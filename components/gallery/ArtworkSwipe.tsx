"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

/** Пометка в адресе, с которой страница работы открывается сразу в просмотре (ArtworkViewer). */
const VIEW_HASH = "#view";

/**
 * Сколько пикселей провести пальцем, чтобы перелистнуть. Меньше — листалось
 * бы от случайного касания при прокрутке, больше — приходилось бы тянуть
 * через полэкрана.
 */
const swipeDistancePx = 60;

/** Быстрый короткий взмах тоже листает — так листают фотографии в телефоне. */
const flickSpeedPxPerMs = 0.5;

/** Поля ввода стрелками двигают курсор — их нажатия не перехватываем. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Открыт ли просмотр во весь экран: тогда переход ведёт сразу в просмотр соседней работы. */
function isViewerOpen(): boolean {
  return document.querySelector(".viewer[open]") !== null;
}

/**
 * Листание работ свайпом и стрелками клавиатуры (заказчик, 12.10.2026).
 *
 * Сами кнопки «‹ 3 / 32 ›» — обычные ссылки в ArtworkStage, и без
 * JavaScript всё листается ими. Здесь только то, что без скрипта не
 * сделать: жест пальцем и клавиши ← →.
 *
 * Пока палец ведёт, картина едет за ним — вполовину медленнее пальца,
 * будто тянешь лист. Это и есть подсказка: отдельной надписи «листайте»
 * нет, жест открывается с первого же касания, а кто не попробует —
 * увидит стрелки со счётчиком под картиной. Не дотянул — картина
 * возвращается на место.
 *
 * Прокрутку страницы жест не ломает: `touch-action: pan-y` оставляет
 * браузеру вертикаль, а сюда приходит только горизонталь. Два пальца —
 * масштаб, его не трогаем.
 *
 * Свайп в открытом просмотре во весь экран тоже листает: окно лежит
 * внутри этого блока, касания всплывают сюда. Картина в окне за пальцем
 * не едет — окно лежит поверх страницы, двигать его вместе с ней незачем.
 */
export function ArtworkSwipe({
  prevHref,
  nextHref,
  style,
  className,
  children,
}: {
  prevHref?: string;
  nextHref?: string;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  // Стрелки клавиатуры — на всей странице, не только по фокусу на картине:
  // так листают галереи на компьютере. Открытый просмотр ловит их сам.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTyping(event.target) || isViewerOpen()) return;
      const href =
        event.key === "ArrowLeft" ? prevHref : event.key === "ArrowRight" ? nextHref : undefined;
      if (href) router.push(href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prevHref, nextHref, router]);

  useEffect(() => {
    const element = box.current;
    if (!element || (!prevHref && !nextHref)) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start: { x: number; y: number; time: number } | null = null;
    // Решается на первых пикселях движения: жест горизонтальный (листаем)
    // или вертикальный (это прокрутка, её не трогаем до конца касания).
    let isHorizontal: boolean | null = null;
    let dx = 0;

    const follow = (offset: number, isAnimated: boolean): void => {
      if (calm || isViewerOpen()) return;
      element.style.transition = isAnimated ? "transform 0.25s ease, opacity 0.25s ease" : "none";
      element.style.transform = offset === 0 ? "" : `translateX(${offset}px)`;
      element.style.opacity = offset === 0 ? "" : String(1 - Math.min(Math.abs(offset) / 600, 0.4));
    };

    const onStart = (event: TouchEvent): void => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
      isHorizontal = null;
      dx = 0;
    };

    const onMove = (event: TouchEvent): void => {
      if (!start || event.touches.length !== 1) return;
      const touch = event.touches[0];
      dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (isHorizontal === null && Math.hypot(dx, dy) > 10)
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (isHorizontal) follow(dx / 2, false);
    };

    const onEnd = (event: TouchEvent): void => {
      if (!start || !isHorizontal) {
        start = null;
        return;
      }
      const speed = Math.abs(dx) / Math.max(event.timeStamp - start.time, 1);
      start = null;
      // Палец влево — следующая работа, как страница в книге.
      const href = dx < 0 ? nextHref : prevHref;
      const isFarEnough = Math.abs(dx) > swipeDistancePx || speed > flickSpeedPxPerMs;
      if (!href || !isFarEnough) {
        follow(0, true);
        return;
      }
      follow(Math.sign(dx) * 160, true);
      router.push(isViewerOpen() ? `${href}${VIEW_HASH}` : href);
    };

    const onCancel = (): void => {
      start = null;
      follow(0, true);
    };

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: true });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onCancel);
    return () => {
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onCancel);
      // Новая работа приходит в тот же блок — сдвиг от прошлого свайпа
      // остался бы на ней.
      element.style.transition = "";
      element.style.transform = "";
      element.style.opacity = "";
    };
  }, [prevHref, nextHref, router]);

  return (
    <div ref={box} style={style} className={className}>
      {children}
    </div>
  );
}
