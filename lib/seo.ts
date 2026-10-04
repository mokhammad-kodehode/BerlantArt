import type { MetadataRoute } from "next";

import type { ArtworkStatus } from "@/lib/generated/prisma/enums";

/**
 * Всё, что сайт сообщает поисковикам: карта сайта, структурированные
 * данные (JSON-LD), абсолютные адреса для превью.
 *
 * Функции чистые и принимают адрес сайта параметром: так их можно
 * проверить тестом без базы и без переменных окружения (lib/seo.test.ts).
 * Адрес берёт вызывающая сторона — `siteUrl()` из lib/site-url.ts.
 *
 * Английская версия сайта в плане (ROADMAP.md, этап «Английская версия»):
 * тогда к каждой записи добавятся `alternates.languages` с hreflang,
 * форма данных под это уже подходит.
 */

/** Страницы без данных из базы, в порядке важности для поиска. */
const staticPages = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
] as const;

/** Работа в карте сайта: что нужно, чтобы её найти и показать в картинках. */
export type SitemapArtwork = {
  id: string;
  updatedAt: Date;
  /** Главное фото — относительный путь или полный адрес хранилища. */
  image?: string;
};

/** Полный адрес из пути: `/gallery` → `https://www.berlant-art.com/gallery`. */
export function absoluteUrl(path: string, base: string): string {
  return new URL(path, base).href;
}

/**
 * Карта сайта: статические страницы и все работы.
 *
 * У работы — дата её последней правки и главное фото: по `images` Google
 * находит картины в поиске по картинкам, а для сайта художницы это едва
 * ли не главный путь, которым приходят посетители.
 */
export function sitemapEntries(base: string, works: SitemapArtwork[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: absoluteUrl(page.path, base),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const artworks: MetadataRoute.Sitemap = works.map((work) => ({
    url: absoluteUrl(`/gallery/${work.id}`, base),
    lastModified: work.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
    ...(work.image ? { images: [absoluteUrl(work.image, base)] } : {}),
  }));

  return [...pages, ...artworks];
}

/** Объект JSON-LD: что угодно, что сериализуется в JSON. */
export type JsonLd = Record<string, unknown>;

/**
 * Художница — schema.org/Person. Только подтверждённое: имя, что она
 * художница, регион (Чеченская Республика) и Instagram.
 */
export function artistJsonLd({
  base,
  name,
  description,
  image,
  sameAs,
}: {
  base: string;
  name: string;
  description: string;
  image: string;
  sameAs: string[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl("/#artist", base),
    name,
    description,
    jobTitle: "Художница",
    url: absoluteUrl("/", base),
    image: absoluteUrl(image, base),
    address: {
      "@type": "PostalAddress",
      addressRegion: "Чеченская Республика",
      addressCountry: "RU",
    },
    sameAs,
  };
}

/** Сайт — schema.org/WebSite: название в выдаче и язык. */
export function websiteJsonLd({ base, name }: { base: string; name: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website", base),
    name,
    url: absoluteUrl("/", base),
    inLanguage: "ru",
    publisher: { "@id": absoluteUrl("/#artist", base) },
  };
}

/** Статус работы в терминах schema.org/ItemAvailability. */
const availability: Record<ArtworkStatus, string> = {
  AVAILABLE: "https://schema.org/InStock",
  RESERVED: "https://schema.org/LimitedAvailability",
  SOLD: "https://schema.org/SoldOut",
};

/**
 * Картина — schema.org/VisualArtwork, с предложением о продаже, если
 * цена указана. По ним Google и Яндекс могут показать в выдаче цену
 * и наличие.
 *
 * Поля без значения не пишутся вовсе, а не пишутся пустыми: пустая строка
 * в разметке — это утверждение «год: ничего», а правило проекта —
 * не утверждать неизвестного (.ai/rules/content.md). Размер холста
 * идёт строкой `size`: в базе он одной строкой, и разбирать его на
 * ширину и высоту ради разметки значит рисковать ошибкой в числе.
 */
export function artworkJsonLd({
  base,
  id,
  title,
  description,
  technique,
  dimensions,
  year,
  price,
  status,
  image,
  artistName,
}: {
  base: string;
  id: string;
  title: string;
  description: string | null;
  technique: string | null;
  dimensions: string | null;
  year: number | null;
  price: number | null;
  status: ArtworkStatus;
  image?: string;
  artistName: string;
}): JsonLd {
  const url = absoluteUrl(`/gallery/${id}`, base);

  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": `${url}#artwork`,
    name: title,
    url,
    artform: "Живопись",
    ...(description ? { description } : {}),
    ...(technique ? { artMedium: technique } : {}),
    ...(dimensions ? { size: dimensions } : {}),
    ...(year ? { dateCreated: String(year) } : {}),
    ...(image ? { image: absoluteUrl(image, base) } : {}),
    creator: { "@type": "Person", "@id": absoluteUrl("/#artist", base), name: artistName },
    ...(price !== null
      ? {
          offers: {
            "@type": "Offer",
            url,
            price,
            priceCurrency: "RUB",
            availability: availability[status],
          },
        }
      : {}),
  };
}

/**
 * JSON-LD в строку для `<script type="application/ld+json">`.
 *
 * `<` заменяется на <, как велит документация Next (guides/json-ld):
 * название работы вводится в админке, и `</script>` в нём закрыл бы тег
 * и открыл дорогу чужому коду на странице.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
