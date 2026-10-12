import type { MetadataRoute } from "next";

import { localeMeta, localePath, locales, type Locale } from "@/lib/i18n/config";

/**
 * Всё, что сайт сообщает поисковикам: карта сайта, структурированные
 * данные (JSON-LD), абсолютные адреса для превью.
 *
 * Функции чистые и принимают адрес сайта параметром: так их можно
 * проверить тестом без базы и без переменных окружения (lib/seo.test.ts).
 * Адрес берёт вызывающая сторона — `siteUrl()` из lib/site-url.ts.
 *
 * Языков два (lib/i18n/config.ts): у каждой страницы в карте сайта —
 * адрес на каждом языке и перекрёстные ссылки hreflang между ними.
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

/** Адреса страницы на всех языках — для hreflang в карте сайта. */
function languageAlternates(path: string, base: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((lang) => [lang, absoluteUrl(localePath(lang, path), base)])),
    "x-default": absoluteUrl(localePath("ru", path), base),
  };
}

/**
 * Карта сайта: статические страницы и все работы, каждая — на каждом языке.
 *
 * У работы — дата её последней правки и главное фото: по `images` Google
 * находит картины в поиске по картинкам, а для сайта художницы это едва
 * ли не главный путь, которым приходят посетители.
 *
 * У каждой записи — ссылки на все языковые версии (hreflang): без них
 * Google может счесть русскую и английскую страницы копиями.
 */
export function sitemapEntries(base: string, works: SitemapArtwork[]): MetadataRoute.Sitemap {
  const pages = staticPages.flatMap((page) =>
    locales.map((lang) => ({
      url: absoluteUrl(localePath(lang, page.path), base),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: languageAlternates(page.path, base) },
    })),
  );

  const artworks = works.flatMap((work) =>
    locales.map((lang) => ({
      url: absoluteUrl(localePath(lang, `/gallery/${work.id}`), base),
      lastModified: work.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: languageAlternates(`/gallery/${work.id}`, base) },
      ...(work.image ? { images: [absoluteUrl(work.image, base)] } : {}),
    })),
  );

  return [...pages, ...artworks];
}

/** Объект JSON-LD: что угодно, что сериализуется в JSON. */
export type JsonLd = Record<string, unknown>;

/**
 * Художница — schema.org/Person. Только подтверждённое: имя, что она
 * художница, регион (Чеченская Республика) и Instagram. Подписи — на языке
 * страницы, идентификатор `@id` один на оба языка: это один человек.
 */
export function artistJsonLd({
  base,
  lang,
  name,
  description,
  jobTitle,
  region,
  image,
  sameAs,
}: {
  base: string;
  lang: Locale;
  name: string;
  description: string;
  jobTitle: string;
  region: string;
  image: string;
  sameAs: string[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl("/#artist", base),
    name,
    description,
    jobTitle,
    url: absoluteUrl(localePath(lang, "/"), base),
    image: absoluteUrl(image, base),
    address: { "@type": "PostalAddress", addressRegion: region, addressCountry: "RU" },
    sameAs,
  };
}

/** Сайт — schema.org/WebSite: название в выдаче и язык этой версии. */
export function websiteJsonLd({
  base,
  lang,
  name,
}: {
  base: string;
  lang: Locale;
  name: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl(`${localePath(lang, "/")}#website`, base),
    name,
    url: absoluteUrl(localePath(lang, "/"), base),
    inLanguage: localeMeta[lang].htmlLang,
    publisher: { "@id": absoluteUrl("/#artist", base) },
  };
}

/**
 * Картина — schema.org/VisualArtwork.
 *
 * Предложения о продаже (`offers`: цена и наличие) нет: продажа на сайте
 * выключена (ARCHITECTURE.md, «Продажа выключена»), и цена в выдаче Google
 * при её отсутствии на странице — это и обещание, которого сайт не даёт,
 * и нарушение правил разметки: данные должны совпадать с видимым текстом.
 *
 * Поля без значения не пишутся вовсе, а не пишутся пустыми: пустая строка
 * в разметке — это утверждение «год: ничего», а правило проекта —
 * не утверждать неизвестного (.ai/rules/content.md). Размер холста
 * идёт строкой `size`: в базе он одной строкой, и разбирать его на
 * ширину и высоту ради разметки значит рисковать ошибкой в числе.
 */
export function artworkJsonLd({
  base,
  lang,
  artform,
  id,
  title,
  description,
  technique,
  dimensions,
  year,
  image,
  artistName,
}: {
  base: string;
  lang: Locale;
  /** «Живопись» / «Painting» — на языке страницы. */
  artform: string;
  id: string;
  title: string;
  description: string | null;
  technique: string | null;
  dimensions: string | null;
  year: number | null;
  image?: string;
  artistName: string;
}): JsonLd {
  const url = absoluteUrl(localePath(lang, `/gallery/${id}`), base);

  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": `${url}#artwork`,
    name: title,
    url,
    inLanguage: localeMeta[lang].htmlLang,
    artform,
    ...(description ? { description } : {}),
    ...(technique ? { artMedium: technique } : {}),
    ...(dimensions ? { size: dimensions } : {}),
    ...(year ? { dateCreated: String(year) } : {}),
    ...(image ? { image: absoluteUrl(image, base) } : {}),
    creator: { "@type": "Person", "@id": absoluteUrl("/#artist", base), name: artistName },
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
