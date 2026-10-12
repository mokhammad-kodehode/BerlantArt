import Link from "next/link";

import { ArtworkImage } from "@/components/ui/ArtworkImage";
import {
  artworkCaption,
  artworkSeo,
  primaryImageUrl,
  type ArtworkWithImages,
} from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { localePath, type Locale } from "@/lib/i18n";

/**
 * Плитка работы: репродукция и название, вся целиком — ссылка на страницу
 * работы.
 *
 * Меток «Продана» и «Забронирована» нет: продажа на сайте выключена
 * (ARCHITECTURE.md, «Продажа выключена»), а метка о продаже — это тоже
 * разговор о продаже.
 *
 * Используется и в коллаже галереи, и в блоке «другие работы» на карточке.
 * Про раскладку плитка ничего не знает: сколько строк и столбцов она займёт
 * и какой ширины отрисуется, решает тот, кто задаёт сетку, и передаёт это
 * через `className` и `sizes`. Формула коллажа живёт в lib/collage.ts.
 */
export function ArtworkTile({
  work,
  lang,
  className,
  sizes = "(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 285px",
}: {
  work: ArtworkWithImages;
  lang: Locale;
  className?: string;
  /** Реальная ширина отрисовки плитки — без неё браузер качает самый крупный вариант. */
  sizes?: string;
}) {
  const caption = artworkCaption(work, lang);

  return (
    <li className={cn("wall-tile list-none", className)}>
      {/*
        Ссылка растянута на всю плитку: кликается и репродукция, и подпись,
        а с клавиатуры это одна остановка, а не три.

        Обводка фокуса убрана внутрь (отрицательный отступ): у плитки
        `overflow: hidden`, и обводка снаружи была бы срезана — фокус стал бы
        невидимым, чего требования доступности не допускают.
      */}
      <Link
        href={localePath(lang, `/gallery/${work.id}`)}
        className="absolute inset-0 block focus-visible:outline-offset-[-3px]"
      >
        <ArtworkImage
          src={primaryImageUrl(work)}
          alt={artworkSeo(work, lang).imageAlt}
          sizes={sizes}
        />

        <span className="wall-caption absolute inset-x-0 bottom-0 block bg-linear-to-t from-[rgb(20_18_17/0.85)] to-transparent p-4">
          <span className="block text-[14px] tracking-[0.02em] text-neutral-100">{work.title}</span>
          {caption && (
            <span className="mt-0.5 block text-[12px] text-neutral-100/70">{caption}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
