"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { GalleryTile } from "@/lib/artworks";
import type { CssVars } from "@/lib/frame-look";
import { localePath, type Locale } from "@/lib/i18n/config";

/** За сколько до лент начинать грузить их картины: успеть до того, как их увидят. */
const nearMargin = "600px 0px";

/**
 * Две ленты работ внизу «О художнице» (заказчик, 23.10.2026, макет
 * «„О художнице" — внизу две ленты»): два ряда картин медленно плывут
 * навстречу друг другу — видно, что работ много, а высота — два ряда.
 * Наведёшь мышь или придёшь Tab-ом — ленты останавливаются; нажатие на
 * картину открывает её страницу.
 *
 * Движение — только CSS (globals.css, «Две ленты работ»). Бесконечность —
 * две одинаковые копии ряда подряд и сдвиг на половину длины. Вторая
 * копия — только для глаз: скринридер и клавиатура проходят каждую
 * картину один раз. При «меньше движения» ленты стоят, копии нет, ряд
 * листается вбок.
 *
 * Клиентский — ради загрузки. Обычная ленивая загрузка тут не работает:
 * пока лента едет сама, браузер не пересматривает, что попало на экран, и
 * копии, выехавшие из-за края, оставались пустыми (на телефоне грузилась
 * половина — 16 из 32, проверено). Поэтому, когда до лент остаётся
 * 600px прокрутки, все их картины грузятся разом; копии берут те же
 * файлы из кеша. Сразу при открытии страницы — нельзя: 16 фото весят
 * ~1,9 МБ, и их скачивал бы каждый, кто не долистал до низа.
 */
export function ArtworkStrips({ tiles, lang }: { tiles: GalleryTile[]; lang: Locale }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsNear(true);
        observer.disconnect();
      },
      { rootMargin: nearMargin },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const shown = tiles.filter((tile) => tile.src !== undefined);
  const half = Math.ceil(shown.length / 2);
  // Второй ряд — задом наперёд: навстречу первому идут другие картины,
  // а не те же в том же порядке.
  const rows = [shown.slice(0, half), shown.slice(half).reverse()].filter((row) => row.length);

  return (
    <div ref={rootRef} className="strips">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="strip-rail">
          <ul className="strip" data-back={rowIndex === 1 || undefined}>
            {row.map((tile) => (
              <StripWork key={tile.id} tile={tile} lang={lang} isCopy={false} isNear={isNear} />
            ))}
            {row.map((tile) => (
              <StripWork key={`${tile.id}-copy`} tile={tile} lang={lang} isCopy isNear={isNear} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StripWork({
  tile,
  lang,
  isCopy,
  isNear,
}: {
  tile: GalleryTile;
  lang: Locale;
  isCopy: boolean;
  isNear: boolean;
}) {
  const style: CSSProperties & CssVars = { "--ratio": tile.ratio ?? 1 };
  return (
    <li data-copy={isCopy || undefined} aria-hidden={isCopy || undefined}>
      <Link
        href={localePath(lang, `/gallery/${tile.id}`)}
        className="strip-work"
        tabIndex={isCopy ? -1 : undefined}
      >
        <span className="strip-art" style={style}>
          {tile.src && (
            <Image
              src={tile.src}
              alt={isCopy ? "" : tile.alt}
              fill
              sizes="(min-width: 1024px) 280px, 180px"
              loading={isNear ? "eager" : "lazy"}
              className="object-cover"
            />
          )}
        </span>
        <span aria-hidden className="strip-name">
          {tile.title}
        </span>
      </Link>
    </li>
  );
}
