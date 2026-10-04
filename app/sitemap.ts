import type { MetadataRoute } from "next";

import { getSitemapArtworks } from "@/lib/artworks";
import { sitemapEntries } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * Карта сайта — /sitemap.xml: по ней Google и Яндекс находят все страницы
 * и новые работы, не дожидаясь, пока набредут на них по ссылкам.
 *
 * Перестраивается раз в час, а не на каждый запрос: поисковики открывают
 * её часто, а новая работа из админки появится в карте самое позднее
 * через час — для поиска это мгновенно. Значение — литерал: Next читает
 * его при сборке.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(siteUrl(), await getSitemapArtworks());
}
