import { roomPageUrl } from "@/lib/ar-links";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { localePath, type Locale } from "@/lib/i18n/config";
import { frameQuery, type CanvasCm, type FrameChoice } from "@/lib/room-options";

/**
 * Картины для «Повесить у себя» (примерочная, TICKETS-primerka.md): какие
 * можно примерить, фильтр списка и адрес страницы с выбором.
 *
 * Список берётся из общего списка работ (/api/artwork-thumbs) — того же,
 * по которому листается лента на странице работы, — а не отдельным
 * запросом в базу: он уже в кеше, и страница не ходит в базу вовсе.
 */

/** Картина примерочной: фото и холст обязательны — без них примерить нечестно. */
export type FittingWork = Pick<ArtworkFeedItem, "id" | "title"> & {
  src: string;
  alt: string;
  canvas: CanvasCm;
  /** Версия модели для камеры; null — в камере эту работу не показать. */
  arVersion: string | null;
  /** Категория по-русски — ключ фильтра; null — без категории. */
  category: string | null;
  /** Та же категория на языке страницы — подпись кнопки фильтра. */
  categoryLabel: string | null;
};

/** Откуда открыта примерочная: из меню («Повесить у себя») или со страницы работы. */
export type FittingEntry = "hang" | "work";

/** Адрес страницы «Повесить у себя» — одинаковый на обоих языках, кроме приставки. */
export const hangPath = "/hang";

/**
 * Работа из общего списка — в картину примерочной. null — примерить нельзя:
 * нет фото или размер холста не читается (lib/artworks.ts, canvasCm).
 */
export function fittingWork(item: ArtworkFeedItem, lang: Locale): FittingWork | null {
  if (item.src === undefined || !item.canvas) return null;
  return {
    id: item.id,
    title: item.title,
    src: item.src,
    alt: item.alt[lang],
    canvas: item.canvas,
    // Копия списка из кеша браузера до 23.10.2026 этих полей не знает.
    arVersion: item.arVersion ?? null,
    category: item.category?.ru ?? null,
    categoryLabel: item.category?.[lang] ?? null,
  };
}

/** Все работы, которые можно примерить, — в порядке галереи. */
export function fittingWorks(list: readonly ArtworkFeedItem[], lang: Locale): FittingWork[] {
  return list.flatMap((item) => fittingWork(item, lang) ?? []);
}

export type FittingCategory = { key: string; label: string };

/** Категории, в которых есть что примерить, — по алфавиту языка страницы. */
export function fittingCategories(works: readonly FittingWork[], lang: Locale): FittingCategory[] {
  const labels = new Map<string, string>();
  for (const work of works) {
    if (work.category !== null && !labels.has(work.category)) {
      labels.set(work.category, work.categoryLabel ?? work.category);
    }
  }
  return [...labels]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

/** «Ёлки» находятся и по «елки»: в названиях буква пишется по-разному. */
function searchable(text: string): string {
  return text.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
}

/** Список по категории (null — все) и по слову из названия. */
export function filterFittingWorks(
  works: readonly FittingWork[],
  { category, query }: { category: string | null; query: string },
): FittingWork[] {
  const words = searchable(query);
  return works.filter(
    (work) =>
      (category === null || work.category === category) &&
      (words === "" || searchable(work.title).includes(words)),
  );
}

/** Идентификатор работы в базе (cuid): буквы и цифры, без знаков. */
const workIdPattern = /^[a-z0-9]{1,64}$/i;

/**
 * Работа из адреса «Повесить у себя» (`?work=…`). Мусор в адресе — null,
 * то есть «ничего не выбрано», а не ошибка: ссылку могли обрезать
 * в мессенджере.
 */
export function parseHangWork(search: string): string | null {
  const id = new URLSearchParams(search).get("work");
  return id !== null && workIdPattern.test(id) ? id : null;
}

/** «/hang?work=…&frame=…» — ссылка ровно на то, что на экране. */
export function hangUrl(lang: Locale, workId: string | null, choice: FrameChoice): string {
  const query = new URLSearchParams();
  if (workId !== null) query.set("work", workId);
  for (const [key, value] of new URLSearchParams(frameQuery(choice))) query.set(key, value);
  const text = query.toString();
  return `${localePath(lang, hangPath)}${text === "" ? "" : `?${text}`}`;
}

/**
 * Адрес примерочной с выбором — тот, что пишется в строку браузера.
 * Со страницы работы — адрес её примерочной (сменили картину — адрес
 * новой), из меню — «Повесить у себя» с картиной в параметре.
 */
export function fittingUrl(
  entry: FittingEntry,
  lang: Locale,
  workId: string | null,
  choice: FrameChoice,
): string {
  return entry === "work" && workId !== null
    ? roomPageUrl(workId, choice, lang)
    : hangUrl(lang, workId, choice);
}
