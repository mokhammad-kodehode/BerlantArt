import Image from "next/image";

import { cn } from "@/lib/cn";

/**
 * Изображение работы — либо настоящее фото, либо заглушка.
 *
 * Реальных снимков картин пока нет, поэтому без `src` компонент рисует
 * тёплую градиентную плашку с названием: композиция страницы видна целиком,
 * и сразу понятно, что здесь будет репродукция. Когда фотографии появятся,
 * менять придётся только `src` на вызывающей стороне — разметка и размеры
 * останутся теми же.
 *
 * Родитель должен быть `position: relative` и иметь заданный размер:
 * изображение растягивается по нему через `fill`.
 */

/** Пары фоновых оттенков заглушки, собраны из токенов палитры. */
const placeholderTones = [
  ["#d9a679", "#8c491a"],
  ["#c8b98d", "#56633f"],
  ["#e0b48c", "#b2622d"],
  ["#bfc2a0", "#3d472b"],
  ["#d6a189", "#643312"],
] as const;

/**
 * Устойчивый выбор оттенка по названию: одна и та же работа всегда получает
 * одну и ту же заглушку, а соседние в сетке не сливаются в одно пятно.
 */
function toneFor(seed: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return placeholderTones[hash % placeholderTones.length];
}

export function ArtworkImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  const [from, to] = toneFor(alt);

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("absolute inset-0 flex items-end justify-start overflow-hidden p-3", className)}
      style={{
        background: `radial-gradient(120% 100% at 30% 20%, ${from}, ${to})`,
      }}
    >
      <span aria-hidden className="font-heading text-[11px] leading-tight text-neutral-100/70">
        {alt}
      </span>
    </div>
  );
}
