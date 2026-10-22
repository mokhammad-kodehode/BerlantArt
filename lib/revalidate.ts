import { revalidatePath } from "next/cache";

import { categoryPagePath, categorySlugs } from "@/lib/gallery-routes";
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
 * `artworkThumbsPath`, а страница работы зависит только от себя (с
 * 22.10.2026 — и без соседей на стрелках: остальные картины рисует лента
 * по общему списку). Значит, правка одной работы обновляет её страницу
 * и общие страницы — и всё.
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
 * Готовые страницы категорий галереи (тикет О-11):
 * `/gallery/category/flowers` (lib/gallery-routes.ts). От набора
 * работ они зависят так же, как сама галерея. Сброс — не пересборка:
 * страница соберётся, только когда её откроют.
 */
export const galleryCategoryPaths: readonly string[] = locales.flatMap((lang) =>
  Object.values(categorySlugs).map((slug) => categoryPagePath(lang, slug)),
);

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
 * Всё, что зависит от набора работ целиком: главная, галерея с её
 * категориями, «О художнице» и «Контакты», общий список и карта сайта. Страницы работ
 * сюда не входят — их называют отдельно (`revalidateArtworkPages`).
 */
export function revalidateSharedPages(): void {
  for (const path of publicPaths) revalidatePath(path);
  for (const path of galleryCategoryPaths) revalidatePath(path);
  revalidatePath(artworkThumbsPath);
  revalidatePath(sitemapPath);
}

/**
 * Страница одной работы на обоих языках. Соседей не трогает: с 22.10.2026
 * на странице работы нет стрелок с их названиями — остальные картины
 * лента берёт из общего списка (`artworkThumbsPath`).
 */
export function revalidateArtworkPage(artworkId: string): void {
  for (const lang of locales) revalidatePath(localePath(lang, `/gallery/${artworkId}`));
}

/**
 * Правка фото: своя страница всегда, а если сменилось главное фото — ещё
 * и общие страницы: оно стоит плиткой в галерее, на главной, в общем
 * списке и в карте сайта. Страницы других работ чужого фото не содержат,
 * их трогать не нужно. `before` и `after` — главное фото до и после правки
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
