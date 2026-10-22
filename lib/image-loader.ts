"use client";

/**
 * Загрузчик next/image — тонкая обёртка: Next требует отдельный файл
 * с функцией по умолчанию (`images.loaderFile` в next.config.ts), а
 * помеченный «use client» модуль нельзя звать с сервера. Сама логика —
 * в lib/image-resize.ts.
 */
export { cloudflareImageUrl as default } from "./image-resize";
