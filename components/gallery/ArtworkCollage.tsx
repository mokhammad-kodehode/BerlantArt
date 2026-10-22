"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { ArtworkTile, tileAnchor } from "@/components/ui/ArtworkTile";
import type { GalleryTile } from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { collageLayout, revealCountFor, revealStep } from "@/lib/collage";
import type { Locale } from "@/lib/i18n/config";

/** Якорь в адресе меняется и без перехода — например, кнопкой «назад». */
function subscribeHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const readHash = (): string => decodeURIComponent(window.location.hash.slice(1));
const noHash = (): string => "";

/**
 * Стена-коллаж: работы разного размера, плотно и без дыр.
 *
 * Вынесено из страницы галереи, когда появился второй потребитель —
 * главная. Абстракция заведена именно поэтому, а не «на будущее»
 * ([architecture.md](../../.ai/rules/architecture.md)).
 *
 * Высота строки считается от ширины столбца, а не от высоты экрана:
 * мелкая плитка всегда 4:3 (на телефоне — квадрат), крупная 2×2 — тоже
 * около 4:3. Прежде строки были `1fr` и растягивались под окно, и это
 * ломалось в обе стороны: на широком мониторе мелкие плитки сплющивались
 * в полоски 432×120 (почти 4:1), а шесть работ на главной, растянутые
 * на экран, превращались в две гигантские и четыре обрезанные.
 *
 * Ширину столбца даёт `@container` на обёртке: единица `cqw` — процент
 * ширины обёртки без её полей, то есть ровно ширина сетки. Сама сетка
 * контейнером быть не может — `cqw` элемента считается от предка.
 * 10px в формулах — зазор `gap-2.5`: 1 зазор на двух столбцах, 3 на четырёх.
 *
 * **Порциями** (тикет О-11). Данные всех плиток лежат в странице — около
 * 300 байт на работу, — а рисуются сначала `revealStep`, следующие —
 * когда до конца стены остаётся полтора экрана, без запроса на сервер.
 * Отдельными запросами порции не грузятся намеренно: это запрос к базе
 * на каждую прокрутку, и при уснувшей базе низ стены не открылся бы.
 * Кнопка «Показать ещё» — для клавиатуры и на случай, если браузер не
 * умеет следить за прокруткой. Поэтому компонент клиентский; на главной
 * работ меньше порции, и он просто рисует все.
 *
 * `className` уходит обёртке: поля и `flex-1` задаёт вызывающая сторона.
 */
export function ArtworkCollage({
  tiles,
  lang,
  className,
  moreLabel,
}: {
  tiles: GalleryTile[];
  lang: Locale;
  className?: string;
  /**
   * Надпись кнопки «Показать ещё». Приходит со страницы, со словарём
   * языка: тащить в браузер словари ради одной надписи незачем (О-12).
   */
  moreLabel: string;
}) {
  // Порядок берётся из раскладки, а не из `tiles`: крупные работы могли
  // переехать в крупные ячейки.
  const layout = useMemo(() => collageLayout(tiles), [tiles]);
  const [shown, setShown] = useState(() => Math.min(layout.length, revealStep));
  const sentinel = useRef<HTMLDivElement>(null);
  const scrolledTo = useRef<string | null>(null);

  // Возврат со страницы работы: «← Все работы» ведёт на
  // `/gallery#work-<id>`. Плитка может быть дальше первой порции —
  // тогда на стене сразу столько порций, чтобы она там была. Якорь
  // читается как внешнее состояние: на сервере его нет, и первая
  // отрисовка совпадает с готовой страницей, а сразу за ней стена
  // дорисовывает нужное.
  const anchor = useSyncExternalStore(subscribeHash, readHash, noHash);
  const returnIndex = layout.findIndex((tile) => tileAnchor(tile.item.id) === anchor);
  const visible =
    returnIndex === -1 ? shown : Math.max(shown, revealCountFor(returnIndex, layout.length));
  const hasMore = visible < layout.length;

  function showMore(): void {
    setShown(Math.min(layout.length, visible + revealStep));
  }

  // Дорисовка при подходе к концу. Наблюдатель создаётся заново после
  // каждой порции: если и после неё конец стены ещё в зоне (высокий
  // экран), он сразу сообщит об этом и дорисует следующую.
  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(Math.min(layout.length, visible + revealStep));
        }
      },
      { rootMargin: "0px 0px 150% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, visible, layout.length]);

  // Прокрутка к плитке — один раз и кадром позже: в собранном сайте Next
  // после перехода сам поднимает страницу наверх, и браузер по якорю не
  // доезжал (заказчик, 19.10.2026; в режиме разработки этого не видно).
  // Отметка ставится в самом кадре, а не до него: в режиме разработки
  // React запускает эффект дважды, и первый кадр отменяется.
  useEffect(() => {
    if (returnIndex === -1 || scrolledTo.current === anchor) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ block: "start" });
      scrolledTo.current = anchor;
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, returnIndex]);

  return (
    <div className={cn("@container", className)}>
      {/* dense только на телефоне: мелкая работа закрывает клетку рядом
          с одиночной мелкой перед крупной (lib/collage.ts, mobileSpans).
          На компьютере раскладка блоками без дыр и так. */}
      <ul className="wall m-0 grid list-none grid-flow-row-dense auto-rows-[calc((100cqw-10px)/2)] grid-cols-2 gap-2.5 p-0 md:grid-flow-row md:auto-rows-[calc((100cqw-30px)*3/16)] md:grid-cols-4">
        {layout.slice(0, visible).map((tile) => (
          <ArtworkTile
            key={tile.item.id}
            tile={tile.item}
            lang={lang}
            className={tile.className}
            sizes={tile.sizes}
          />
        ))}
      </ul>

      {hasMore && (
        <div ref={sentinel} className="mt-8 flex justify-center">
          <Button variant="soft" onClick={showMore}>
            {moreLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
