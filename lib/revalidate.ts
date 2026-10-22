import { revalidatePath } from "next/cache";

import { localePath, locales } from "@/lib/i18n/config";

/**
 * Сброс кеша публичных страниц после правки в админке.
 *
 * Вынесено из экшенов в отдельный модуль по двум причинам. Первая: в файле
 * с `"use server"` наружу можно отдавать только асинхронные функции —
 * обычную туда не положить. Вторая важнее: список страниц, зависящих
 * от работ, обязан быть один. Разъедься он между экшенами — часть правок
 * начнёт появляться на сайте сразу, а часть только через сутки, и понять,
 * почему так, будет не по чему.
 *
 * **Страницы работ по одной, а не все разом** (тикет О-5, 22.10.2026).
 * Каждый сброс — пересборка при следующем заходе, то есть запись в кеш
 * Vercel, на бесплатном тарифе ограниченная (ARCHITECTURE.md §9). Раньше
 * любая правка сбрасывала все ~400 страниц работ: на каждой стоял номер
 * «129 / 203» и список «Всех работ». Теперь и то и другое — в общем файле
 * `artworkThumbsPath`, а страница работы зависит только от себя и от
 * названий двух соседей на стрелках. Значит, правка одной работы
 * обновляет её страницу, страницы её соседей и общие страницы — и всё.
 */

/**
 * Готовые адреса: главная, галерея, а также «О художнице» и «Контакты» —
 * на них стоит картина из выборки для главной. На каждом языке свои.
 */
export const publicPaths = [
  "/",
  "/gallery",
  "/about",
  "/contact",
  "/en",
  "/en/gallery",
  "/en/about",
  "/en/contact",
] as const;

/**
 * Общий список работ с миниатюрами (app/api/artwork-thumbs): по нему
 * панель «Все работы» показывает ленту, а счётчик «129 / 203» — номер.
 */
export const artworkThumbsPath = "/api/artwork-thumbs";

/**
 * Карта сайта (app/sitemap.ts): в ней адрес, дата правки и главное фото
 * каждой работы. Мелкие правки (только своя страница) её не трогают:
 * дату правки в карте поправит суточная пересборка, поисковику она не
 * срочна.
 */
export const sitemapPath = "/sitemap.xml";

/**
 * Всё, что зависит от набора работ целиком: главная, галерея, «О
 * художнице» и «Контакты», общий список и карта сайта. Страницы работ
 * сюда не входят — их называют отдельно (`revalidateArtworkPages`).
 */
export function revalidateSharedPages(): void {
  for (const path of publicPaths) revalidatePath(path);
  revalidatePath(artworkThumbsPath);
  revalidatePath(sitemapPath);
}

/**
 * Страницы перечисленных работ на обоих языках. `null` пропускается:
 * у единственной работы нет соседей. Повторы — тоже: у двух работ сосед
 * слева и справа один и тот же.
 */
export function revalidateArtworkPages(ids: Iterable<string | null | undefined>): void {
  const unique = new Set<string>();
  for (const id of ids) if (id) unique.add(id);

  for (const id of unique) {
    for (const lang of locales) revalidatePath(localePath(lang, `/gallery/${id}`));
  }
}

/**
 * Только страница одной работы. Для правок, которых не видно больше
 * нигде: подпись к фото, порядок дополнительных фото, статус (продажа
 * выключена — на стене и в галерее его нет).
 */
export function revalidateArtworkPage(artworkId: string): void {
  revalidateArtworkPages([artworkId]);
}

/**
 * Правка фото: своя страница всегда, а если сменилось главное фото — ещё
 * и общие страницы: оно стоит плиткой в галерее, на главной, в общем
 * списке и в карте сайта. На страницах соседей чужого фото нет, их
 * трогать не нужно. `before` и `after` — главное фото до и после правки
 * (`primaryImageId`).
 */
export function revalidateAfterImageChange(
  artworkId: string,
  before: string | null,
  after: string | null,
): void {
  revalidateArtworkPage(artworkId);
  if (before !== after) revalidateSharedPages();
}

/** Страница работы в админке — её тоже надо обновить, иначе список
 * фотографий на ней останется прежним. */
export function revalidateAdminArtwork(artworkId: string): void {
  revalidatePath(`/admin/artworks/${artworkId}`);
  // Список работ показывает статус и превью — после правки он устареет
  // вместе со страницей работы, поэтому обновляется тем же вызовом.
  revalidatePath("/admin/artworks");
}
