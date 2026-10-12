"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";

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
 *
 * `fit` управляет тем, что делать с несовпадением пропорций. По умолчанию
 * `cover` — кадр заполняется, края срезаются: в сетке галереи это правильно,
 * плитки должны стоять ровным рядом. На странице самой работы нужен
 * `contain`: обрезать картину на её собственной странице нельзя, покупатель
 * должен видеть холст целиком.
 *
 * `loader` — что показать, пока фото грузится (заказчик, 12.10.2026):
 * `card` — серая мерцающая плитка, как в скелете галереи; `palette` —
 * палитра художника с бегущим вокруг мазком, для одной крупной картины
 * на странице работы. Плиток на стене десятки, и десяток вращающихся
 * значков рябил бы, — поэтому у них просто карточка.
 *
 * Заглушка лежит под фото, а не вместо него, и убирается по `onLoad`.
 * Так без JavaScript ничего не ломается: фото просто ложится поверх.
 * Компонент клиентский только ради этого `onLoad` — next/image и так
 * клиентский, лишнего кода в браузер почти не добавляется.
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
  fit = "cover",
  loader,
  aspect,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  loader?: "card" | "palette";
  /**
   * Пропорции фото, ширина к высоте. При `fit="contain"` по ним заглушка
   * встаёт ровно в контур будущей картины, а не на весь блок.
   */
  aspect?: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (src) {
    return (
      <>
        {loader && !isLoaded && (
          <ImageLoader kind={loader} aspect={fit === "contain" ? aspect : undefined} />
        )}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          onLoad={() => setIsLoaded(true)}
          className={cn(fit === "contain" ? "object-contain" : "object-cover", className)}
        />
      </>
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
      <span aria-hidden className="font-heading text-[12px] leading-tight text-neutral-100/70">
        {alt}
      </span>
    </div>
  );
}

/**
 * Заглушка на время загрузки. С `aspect` — по контуру картины: блок
 * становится контейнером размеров (`.image-loader-frame`), и рамка
 * вписывается в него так же, как фото с object-contain.
 */
function ImageLoader({ kind, aspect }: { kind: "card" | "palette"; aspect?: number }) {
  const frameStyle: (CSSProperties & { "--loader-ratio": number }) | undefined =
    aspect === undefined ? undefined : { "--loader-ratio": aspect };

  return (
    <div
      aria-hidden
      className={cn("absolute inset-0", aspect !== undefined && "image-loader-frame")}
    >
      <div style={frameStyle} className="image-loader">
        {kind === "palette" && (
          <svg viewBox="0 0 64 64" className="image-loader-palette">
            {/* Мазок, бегущий по кругу вокруг палитры. */}
            <circle cx="32" cy="32" r="29" className="image-loader-ring" />
            {/* Палитра: овал с вырезом под палец и пять красок. */}
            <path
              d="M32 14c-10.5 0-19 7.2-19 16.5 0 7.4 5.6 13.5 13 13.5 2.6 0 3.6-1.6 3.6-3.4 0-2.4 2-4.1 4.4-4.1h3.4C44.6 36.5 51 32.3 51 26 51 19.4 42.5 14 32 14Z"
              className="image-loader-board"
            />
            <circle cx="22" cy="27" r="2.6" className="image-loader-dot" />
            <circle cx="28" cy="21" r="2.6" className="image-loader-dot" />
            <circle cx="36" cy="20" r="2.6" className="image-loader-dot" />
            <circle cx="43" cy="25" r="2.6" className="image-loader-dot" />
            <circle cx="21" cy="35" r="2.6" className="image-loader-dot" />
          </svg>
        )}
      </div>
    </div>
  );
}
