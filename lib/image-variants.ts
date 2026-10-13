/**
 * Уменьшенные копии фото работ (тикет И-1, ARCHITECTURE.md §8).
 *
 * Копии режет сервер — при загрузке (attachImage) и разово для уже
 * загруженных (scripts/make-image-variants.mjs). Сайт отдаёт копию нужной
 * ширины сам (lib/image-loader.ts), без обработки Vercel и её лимитов.
 *
 * Признак «у фото есть копии» — сам ключ: он лежит в папке `artworks/v2/`.
 * Так не нужен отдельный столбец в базе, а фото без копий (старые, или
 * если нарезка где-то не прошла) сайт показывает исходником, и ничего
 * не пропадает. Здесь только чистые функции — их проверяют тесты, и их же
 * повторяет скрипт нарезки (тест сверяет, что они не разошлись).
 */

/** Папка ключей, у которых рядом лежат копии. */
export const variantPrefix = "artworks/v2/";

/**
 * Ширины копий. 400 — мелкие плитки и миниатюры, 800 — плитки стены,
 * 1200 — крупные плитки и телефон, 1600 — страница работы на компьютере.
 * Шире 1600 сайт берёт исходник: он и так не шире 2500px
 * (lib/prepare-image.ts), копия на 2000 мало бы от него отличалась.
 */
export const variantWidths = [400, 800, 1200, 1600] as const;

export type VariantWidth = (typeof variantWidths)[number];

/** Лежит ли у фото рядом набор копий. Принимает и ключ, и полный адрес. */
export function hasVariants(keyOrUrl: string): boolean {
  return keyOrUrl.includes(variantPrefix);
}

/** Ключ копии: `artworks/v2/<имя>.w800.webp` рядом с `artworks/v2/<имя>.webp`. */
export function variantKey(key: string, width: VariantWidth): string {
  return `${key.replace(/\.[a-z0-9]+$/, "")}.w${width}.webp`;
}

/** Все ключи копий фото — чтобы удалить их вместе с исходником. */
export function variantKeys(key: string): string[] {
  return hasVariants(key) ? variantWidths.map((width) => variantKey(key, width)) : [];
}

/**
 * Какую копию брать под нужную ширину: самую узкую из тех, что не уже
 * нужной. `null` — нужно шире самой крупной копии, тогда берётся исходник.
 */
export function pickVariantWidth(width: number): VariantWidth | null {
  return variantWidths.find((candidate) => candidate >= width) ?? null;
}

/**
 * Адрес картинки под ширину. Фото с копиями — адрес копии (или исходника,
 * если нужно шире 1600). Остальные — адрес как есть: файл тот же при
 * любой ширине, и браузер скачает его один раз.
 */
export function imageSrcForWidth(src: string, width: number): string {
  if (!hasVariants(src)) return src;

  const picked = pickVariantWidth(width);
  if (picked === null) return src;

  // Адрес — ключ с доменом бакета впереди; запрос и якорь в нём не бывают.
  return variantKey(src, picked);
}
