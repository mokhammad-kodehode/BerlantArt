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
 * `loader` — серая мерцающая карточка, пока фото грузится (заказчик,
 * 12.10.2026), как в скелете галереи. Палитра с мазком по кругу на
 * странице работы была и убрана — выглядела дёшево рядом с живописью.
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
  eager,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Грузить сразу, не дожидаясь, пока картина подъедет к экрану. Ленте
   * на странице работы: соседняя картина за краем ленты для браузера
   * «не видна», и ленивая подгрузка начиналась бы только посреди свайпа.
   */
  eager?: boolean;
  fit?: "cover" | "contain";
  /** Серая мерцающая карточка, пока фото грузится. */
  loader?: boolean;
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
        {loader && !isLoaded && <ImageLoader aspect={fit === "contain" ? aspect : undefined} />}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          // У priority своя загрузка — сразу и с высоким приоритетом.
          loading={eager && !priority ? "eager" : undefined}
          onLoad={() => setIsLoaded(true)}
          // Не загрузилось — мерцать бесконечно незачем: заглушка убирается,
          // и браузер показывает подпись картины вместо пустой серой плитки.
          onError={() => setIsLoaded(true)}
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
function ImageLoader({ aspect }: { aspect?: number }) {
  const frameStyle: (CSSProperties & { "--loader-ratio": number }) | undefined =
    aspect === undefined ? undefined : { "--loader-ratio": aspect };

  return (
    <div
      aria-hidden
      className={cn("absolute inset-0", aspect !== undefined && "image-loader-frame")}
    >
      <div style={frameStyle} className="image-loader" />
    </div>
  );
}
