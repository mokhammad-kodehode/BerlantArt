import type { Metadata } from "next";

import { serverEnv } from "@/lib/env";
import { getDictionary, localeMeta, localePath, locales, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";

/**
 * Метаданные, общие для страниц обоих языков.
 *
 * `metadataBase` — адрес сайта: от него Next строит полные ссылки на
 * картинки превью и канонические адреса. Без него ссылка в Telegram
 * и WhatsApp приходила без картинки.
 *
 * Каноническая ссылка здесь намеренно НЕ задаётся: из корня она досталась
 * бы всем страницам, и поисковик решил бы, что весь сайт — копии главной.
 * Её задаёт каждая страница сама — через `pageAlternates`.
 */
export function rootMetadata(lang: Locale): Metadata {
  const t = getDictionary(lang).site;
  const other = locales.filter((locale) => locale !== lang);

  return {
    metadataBase: new URL(siteUrl()),
    applicationName: t.artist,
    title: { default: t.defaultTitle, template: `%s · ${t.artist}` },
    description: t.metaDescription,
    openGraph: {
      title: t.ogTitle,
      description: t.metaDescription,
      siteName: t.artist,
      locale: localeMeta[lang].ogLocale,
      alternateLocale: other.map((locale) => localeMeta[locale].ogLocale),
      type: "website",
      // 1200×630 JPEG: размер, который ждут мессенджеры и соцсети; WebP
      // WhatsApp показывает не всегда. Страница работы подставляет картину.
      images: [{ url: "/og/berlant.jpg", width: 1200, height: 630, alt: t.ogImageAlt }],
    },
    twitter: { card: "summary_large_image" },
    // Коды из Google Search Console и Яндекс.Вебмастера — из окружения:
    // добавить сайт в кабинет можно без правки кода.
    verification: {
      google: serverEnv.GOOGLE_SITE_VERIFICATION,
      yandex: serverEnv.YANDEX_VERIFICATION,
    },
  };
}

/**
 * Каноническая ссылка и hreflang страницы: адрес на этом языке плюс
 * ссылки на версию на каждом языке и `x-default` (русская — основная).
 *
 * Так Google показывает англоязычному человеку английскую страницу,
 * русскоязычному — русскую, и не считает их копиями друг друга.
 * `path` — русский адрес без приставки: `/gallery/abc`.
 */
export function pageAlternates(lang: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localePath(lang, path),
    languages: {
      ...Object.fromEntries(locales.map((locale) => [locale, localePath(locale, path)])),
      "x-default": localePath("ru", path),
    },
  };
}
