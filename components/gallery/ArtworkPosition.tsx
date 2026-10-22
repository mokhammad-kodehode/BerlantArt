"use client";

import { useEffect, useState } from "react";

import { fetchArtworkThumbs, positionOf } from "@/lib/artwork-thumbs";
import { useDictionary } from "@/lib/i18n/client";

/**
 * Счётчик «129 / 203» между стрелками на странице работы.
 *
 * Считает браузер по общему списку работ, а не сервер в самой странице
 * (тикет О-5, 22.10.2026): номер и общее число меняются у всех ~400
 * страниц с каждой новой картиной, и все они уходили на пересборку —
 * записи в кеш Vercel. Пока список грузится, место под число пустое,
 * но той же ширины (`.stage-pager-count`), и стрелки не сдвигаются.
 * Не загрузился — счётчика просто нет: стрелки работают и без него.
 */
export function ArtworkPosition({ currentId }: { currentId: string }) {
  const t = useDictionary().work;
  const [place, setPlace] = useState<{ position: number; total: number } | null>(null);

  useEffect(() => {
    let isCurrent = true;
    fetchArtworkThumbs()
      .then((works) => {
        if (isCurrent) setPlace(positionOf(works, currentId));
      })
      .catch((error: unknown) => {
        // Счётчик — подсказка, а не необходимость: страница цела и без
        // него. Причина уходит в консоль, чтобы её можно было найти.
        console.error(error);
      });
    return () => {
      isCurrent = false;
    };
  }, [currentId]);

  return (
    <>
      <span aria-hidden className="stage-pager-count">
        {place && `${place.position} / ${place.total}`}
      </span>
      {place && <span className="sr-only">{t.position(place.position, place.total)}</span>}
    </>
  );
}
