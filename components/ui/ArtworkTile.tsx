import Link from "next/link";

import { ArtworkImage } from "@/components/ui/ArtworkImage";
import type { GalleryTile } from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { localePath, type Locale } from "@/lib/i18n/config";

/** Якорь плитки на стене: `/gallery#work-<id>` прокручивает к этой работе. */
export function tileAnchor(workId: string): string {
  return `work-${workId}`;
}

/**
 * Плитка работы: репродукция и название, вся целиком — ссылка на страницу
 * работы.
 *
 * Меток «Продана» и «Забронирована» нет: продажа на сайте выключена
 * (ARCHITECTURE.md, «Продажа выключена»), а метка о продаже — это тоже
 * разговор о продаже.
 *
 * Данные — готовая плитка (`GalleryTile`, собирает `galleryTile` у
 * выборки), а не работа из базы: плитку рисует и клиентская стена
 * галереи, а модуль с запросами в браузер не попадает.
 *
 * Про раскладку плитка ничего не знает: сколько строк и столбцов она займёт
 * и какой ширины отрисуется, решает тот, кто задаёт сетку, и передаёт это
 * через `className` и `sizes`. Формула коллажа живёт в lib/collage.ts.
 */
export function ArtworkTile({
  tile,
  lang,
  className,
  sizes = "(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 285px",
}: {
  tile: GalleryTile;
  lang: Locale;
  className?: string;
  /** Реальная ширина отрисовки плитки — без неё браузер качает самый крупный вариант. */
  sizes?: string;
}) {
  return (
    // id — якорь: «← В галерею» на странице работы ведёт сюда,
    // к той же плитке, а не в начало стены (заказчик, 16.10.2026).
    <li id={tileAnchor(tile.id)} className={cn("wall-tile list-none", className)}>
      {/*
        Ссылка растянута на всю плитку: кликается и репродукция, и подпись,
        а с клавиатуры это одна остановка, а не три.

        Обводка фокуса убрана внутрь (отрицательный отступ): у плитки
        `overflow: hidden`, и обводка снаружи была бы срезана — фокус стал бы
        невидимым, чего требования доступности не допускают.

        prefetch={false}: по умолчанию Next заранее запрашивает страницу,
        как только ссылка попала на экран. На стене из 200 плиток это
        десятки страниц картин за одну прокрутку (замер 22.10.2026: 40
        запросов за шесть прокруток на 30 работах), и после каждой правки
        в админке они пересобирались — записи в кеш Vercel, на бесплатном
        тарифе ограниченные (ARCHITECTURE.md §9). Теперь страница
        запрашивается по нажатию: переход на долю секунды дольше.
      */}
      <Link
        href={localePath(lang, `/gallery/${tile.id}`)}
        prefetch={false}
        className="absolute inset-0 block focus-visible:outline-offset-[-3px]"
      >
        <ArtworkImage src={tile.src} alt={tile.alt} sizes={sizes} loader />

        <span className="wall-caption absolute inset-x-0 bottom-0 block bg-linear-to-t from-[rgb(20_18_17/0.85)] to-transparent p-4">
          <span className="block text-[14px] tracking-[0.02em] text-neutral-100">{tile.title}</span>
          {tile.caption && (
            <span className="mt-0.5 block text-[12px] text-neutral-100/70">{tile.caption}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
