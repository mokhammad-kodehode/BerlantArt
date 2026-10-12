import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

/**
 * Описание сайта как приложения: название и значок, когда сайт добавляют
 * на главный экран Android или в закладки. Значки — та же палитра, что во
 * вкладке (app/icon.svg); PNG 192 и 512 — размеры, которые требует Android.
 * Цвета — умбра кнопок и почти белая стена светлого зала.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.artist,
    short_name: "Берлант",
    description: site.description,
    lang: "ru",
    start_url: "/",
    display: "browser",
    background_color: "#f5f4f1",
    theme_color: "#2b251f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
