import type { MetadataRoute } from "next";

import { getSitemapArtworks } from "@/lib/artworks";
import { sitemapEntries } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * Карта сайта — /sitemap.xml: по ней Google и Яндекс находят все страницы
 * и новые работы, не дожидаясь, пока набредут на них по ссылкам.
 *
 * Обновляется после правки в админке (`sitemapPath` в lib/revalidate.ts):
 * новая работа попадает в карту сразу. Раз в сутки — подстраховка. Было
 * раз в час: адрес в карте — около 0,6 КБ (замер 22.10.2026: 70 адресов —
 * 41 КБ), на 412 адресах это ~240 КБ, ~30 записей в кеш Vercel за
 * пересборку, а поисковики открывают карту часто — до ~20 тысяч записей
 * в месяц впустую (docs/obzor-proekta.md, П0-1в).
 * Значение — литерал: Next читает его при сборке.
 */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(siteUrl(), await getSitemapArtworks());
}
