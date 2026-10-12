import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * Поиск в галерее (заказчик, 12.10.2026): разбор запроса из адреса
 * и сборка адресов галереи. Только чистые функции — их проверяют тесты,
 * а сам запрос к базе живёт в lib/artworks.ts.
 */

/** Длиннее названия и пары слов описания не ищут; больше — мусор в адресе. */
export const maxSearchLength = 100;

/**
 * Запрос к виду, в котором его сравнивает база: без краевых и двойных
 * пробелов, строчными, «ё» как «е». Без последнего «береза» не находила бы
 * «Берёзу в поле» — так почти все печатают на телефоне. Пустой — `undefined`:
 * `/gallery?q=` не должен отличаться от `/gallery`.
 */
export function normalizeSearch(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const query = raw.trim().replace(/\s+/g, " ").toLowerCase().replaceAll("ё", "е");
  if (query === "") return undefined;
  return query.slice(0, maxSearchLength).trimEnd();
}

/**
 * Шаблон для LIKE: запрос где угодно в тексте. Знаки `%` и `_` в самом
 * запросе экранируются — иначе «100%» искал бы «100 и что угодно дальше»,
 * а одиночный `_` совпадал бы с любой буквой.
 */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * Категории, чьё название на языке страницы содержит запрос. Нужно
 * английской версии: названия работ и категории в базе по-русски, и
 * «flowers» иначе не нашёл бы «Цветы».
 */
export function categoriesMatching(
  query: string,
  categories: readonly string[],
  translate: (category: string) => string | null,
): string[] {
  return categories.filter((category) =>
    (normalizeSearch(translate(category) ?? undefined) ?? "").includes(query),
  );
}

/** Выбор в галерее, который живёт в адресе. */
export type GalleryQuery = { category?: string; q?: string };

/**
 * Адрес галереи с выбором. Пустые поля в адрес не пишутся: «все категории
 * без поиска» — это `/gallery`, а не `/gallery?category=&q=`.
 */
export function galleryHref(lang: Locale, { category, q }: GalleryQuery): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const query = params.toString();
  const path = localePath(lang, "/gallery");
  return query ? `${path}?${query}` : path;
}
