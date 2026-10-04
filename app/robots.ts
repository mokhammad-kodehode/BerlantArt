import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * /robots.txt: что поисковикам обходить и где карта сайта.
 *
 * Закрыты только админка и витрина дизайн-системы — служебное.
 * Примерочная и камера (/gallery/…/room, /ar) здесь НЕ закрыты намеренно:
 * у них в метаданных стоит noindex, а страницу, закрытую в robots.txt,
 * поисковик не открывает и noindex не видит — и может оставить её в выдаче
 * по чужой ссылке, без описания.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/styleguide"],
    },
    sitemap: absoluteUrl("/sitemap.xml", base),
  };
}
