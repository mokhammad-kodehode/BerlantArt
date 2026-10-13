"use client";

import type { ImageLoaderProps } from "next/image";

import { hasVariants, imageSrcForWidth, pickVariantWidth } from "@/lib/image-variants";

/**
 * Как `next/image` получает адрес картинки под нужную ширину (тикет И-1).
 *
 * Вместо обработки Vercel — готовые копии из бакета (lib/image-variants.ts).
 * Подключён на весь сайт через `images.loaderFile` в next.config.ts.
 *
 * У фото без копий — старых, из `public/`, или если нарезка не прошла —
 * адрес тот же, с `?w=` в хвосте. Файл от этого не меняется: хвост нужен,
 * чтобы Next видел, что ширину загрузчик учитывает, и не ругался в
 * консоли разработчика. То же для фото шире самой крупной копии: там
 * отдаётся исходник.
 */
export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (hasVariants(src) && pickVariantWidth(width) !== null) return imageSrcForWidth(src, width);

  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
