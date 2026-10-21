import { revalidatePath } from "next/cache";

import { localePath, locales } from "@/lib/i18n/config";

/**
 * Сброс кеша публичных страниц после правки в админке.
 *
 * Вынесено из экшенов в отдельный модуль по двум причинам. Первая: в файле
 * с `"use server"` наружу можно отдавать только асинхронные функции —
 * обычную туда не положить. Вторая важнее: список страниц, зависящих
 * от работ, обязан быть один. Разъедься он между экшенами — часть правок
 * начнёт появляться на сайте сразу, а часть через пять минут, и понять,
 * почему так, будет не по чему.
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
 * Страницы работ — шаблоны по файлам в `app/`, а не адреса: их столько же,
 * сколько работ. **Группа маршрута в шаблоне обязательна** (документация
 * Next, revalidatePath, «with route groups»). Когда страницы разложили по
 * языкам в `(ru)` и `(en)`, здесь остался `/gallery/[id]` без группы —
 * вызов перестал находить страницу, и правка в админке появлялась на сайте
 * только через пять минут (`revalidate = 300`), заказчик 12.10.2026.
 * Тест сверяет шаблоны с файлами, чтобы при следующем переезде это упало
 * сразу.
 */
/** Общий список миниатюр для панели «Все работы» (app/api/artwork-thumbs). */
export const artworkThumbsPath = "/api/artwork-thumbs";

export const artworkPagePatterns = ["/(ru)/gallery/[id]", "/(en)/en/gallery/[id]"] as const;

export function revalidatePublicPages(): void {
  // Сбрасывает ВСЕ страницы работ (~400 на двух языках), и каждая потом
  // собирается заново при первом заходе — это записи в кеш Vercel, на
  // бесплатном тарифе они ограничены (21.10.2026: 367 тысяч за месяц).
  // Правка, которая не видна за пределами своей работы, зовёт
  // revalidateArtworkPage — она обновляет две страницы, а не четыреста.
  for (const path of publicPaths) revalidatePath(path);
  // Путь с динамическим сегментом требует второго аргумента: без него
  // вызов не находит, какие именно страницы обновлять.
  for (const pattern of artworkPagePatterns) revalidatePath(pattern, "page");
  revalidatePath(artworkThumbsPath);
}

/** Страница работы в админке — её тоже надо обновить, иначе список
 * фотографий на ней останется прежним. */
export function revalidateAdminArtwork(artworkId: string): void {
  revalidatePath(`/admin/artworks/${artworkId}`);
  // Список работ показывает статус и превью — после правки он устареет
  // вместе со страницей работы, поэтому обновляется тем же вызовом.
  revalidatePath("/admin/artworks");
}

/**
 * Только страница одной работы, на обоих языках. Для правок, которых
 * не видно больше нигде: подпись к фото, порядок дополнительных фото,
 * статус (продажа выключена, на стене и в галерее его нет). Главное
 * фото к таким не относится — оно стоит в галерее, на главной и в
 * миниатюрах «Всех работ» на каждой странице.
 */
export function revalidateArtworkPage(artworkId: string): void {
  for (const lang of locales) revalidatePath(localePath(lang, `/gallery/${artworkId}`));
}

/**
 * Поменялось главное фото — сбросить всё, иначе только свою страницу.
 * `before` и `after` — главное фото до и после правки (`primaryImageId`).
 */
export function revalidateAfterImageChange(
  artworkId: string,
  before: string | null,
  after: string | null,
): void {
  if (before === after) {
    revalidateArtworkPage(artworkId);
    return;
  }
  revalidatePublicPages();
}
