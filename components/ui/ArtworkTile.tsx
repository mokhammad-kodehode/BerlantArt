import Link from "next/link";

import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { Tag } from "@/components/ui/Tag";
import {
  artworkCaption,
  artworkStatusLabel,
  primaryImageUrl,
  type ArtworkWithImages,
} from "@/lib/artworks";
import { cn } from "@/lib/cn";

/**
 * Плитка работы: репродукция, название и метка статуса, вся целиком —
 * ссылка на страницу работы.
 *
 * Используется и на «стене» галереи, и в блоке «другие работы» на карточке.
 * Про раскладку плитка ничего не знает: сколько строк и столбцов она займёт,
 * решает тот, кто задаёт сетку, и передаёт это через `className`. Формула
 * неровной развески осталась в галерее — в ряду «других работ» она не нужна.
 */
export function ArtworkTile({ work, className }: { work: ArtworkWithImages; className?: string }) {
  const label = artworkStatusLabel(work.status);
  const caption = artworkCaption(work);

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
        href={`/gallery/${work.id}`}
        className="absolute inset-0 block focus-visible:outline-offset-[-3px]"
      >
        {/* Ширина плитки: половина экрана на телефоне, четверть колонки
            в 1200px на десктопе — отсюда и значения sizes. */}
        <span className="washed absolute inset-0">
          <ArtworkImage
            src={primaryImageUrl(work)}
            alt={work.title}
            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 285px"
          />
        </span>

        {label && (
          <Tag
            tone={work.status === "SOLD" ? "neutral" : "accent"}
            className="absolute top-3.5 left-3.5"
          >
            {label}
          </Tag>
        )}

        <span className="wall-caption absolute inset-x-0 bottom-0 block bg-linear-to-t from-[rgb(20_18_17/0.85)] to-transparent p-4">
          <span className="block text-[14px] tracking-[0.02em] text-neutral-100">{work.title}</span>
          {caption && (
            <span className="mt-0.5 block text-[11.5px] text-neutral-100/70">{caption}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
