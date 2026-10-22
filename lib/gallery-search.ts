import {
  categoryBySlug,
  categoryPagePath,
  categorySlug,
  gallerySearchPath,
} from "@/lib/gallery-routes";
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

/** Параметры адреса в том виде, в каком их отдаёт Next. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Разбор параметров адреса поиска — единственное место, где им можно
 * верить только после проверки ([architecture.md](../.ai/rules/architecture.md)).
 *
 * Повторённый параметр (`?category=A&category=B`) Next отдаёт массивом —
 * берётся первое значение, а не роняется страница. Пустое — «без
 * фильтра». Категория приходит латинским адресом (`flowers`), а по
 * старым ссылкам — названием (`Цветы`): понимаются оба. Несуществующая категория отдельной проверки не требует: она
 * просто даёт пустую выборку в базе. Фильтра по статусу нет, `?status=`
 * из старых ссылок не читается вовсе (продажа выключена).
 *
 * Без zod намеренно: модуль попадает в браузер (строка поиска), и тащить
 * туда библиотеку проверки ради двух строк незачем.
 */
export function parseGalleryQuery(raw: RawSearchParams): GalleryQuery {
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const category = first(raw.category) || undefined;
  return {
    category: category === undefined ? undefined : (categoryBySlug(category) ?? category),
    q: first(raw.q),
  };
}

/**
 * Адрес галереи с выбором (тикет О-11, lib/gallery-routes.ts):
 *
 * - ничего не выбрано — `/gallery`;
 * - только категория — её готовая страница `/gallery/category/flowers`;
 * - есть запрос — поиск `/gallery/search?q=…`, категория уходит туда
 *   параметром: поиск ищет внутри неё.
 *
 * Пустые поля в адрес не пишутся. Категория не из списка своей страницы
 * не имеет — для неё тоже поиск, он фильтрует любой категорией.
 */
export function galleryHref(lang: Locale, { category, q }: GalleryQuery): string {
  const slug = category === undefined ? undefined : categorySlug(category);
  if (!q && !category) return localePath(lang, "/gallery");
  if (!q && slug !== undefined) return categoryPagePath(lang, slug);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", slug ?? category);
  return `${gallerySearchPath(lang)}?${params}`;
}

/** Значение категории для скрытого поля формы поиска — как в `galleryHref`. */
export function categoryParam(category: string): string {
  return categorySlug(category) ?? category;
}
