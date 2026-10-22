import type { ArtworkThumb } from "@/lib/artworks";

/**
 * Общий список работ в браузере: один запрос за посещение на всё, что
 * в нём нуждается, — счётчик «129 / 203» (ArtworkPosition), сетка
 * «Все работы» (ArtworkPicker) и число работ в переключателе (CaptionTabs).
 *
 * Список отдаёт `/api/artwork-thumbs`, а не сама страница работы, — иначе
 * каждая новая картина меняла бы все ~400 страниц (тикет О-5,
 * lib/revalidate.ts). Обещание хранится на уровне модуля: при переходе
 * к соседней работе внутри сайта модуль не перезагружается, и второй
 * запрос не уходит. Не вышло — забываем обещание, чтобы следующая
 * попытка (кнопка «Попробовать ещё раз») пошла заново.
 *
 * Модуль только для браузера: на сервере тот же список даёт
 * `getArtworkThumbs` из lib/artworks.ts.
 */

/** Адрес общего списка (app/api/artwork-thumbs/route.ts). */
export const artworkThumbsUrl = "/api/artwork-thumbs";

/** Ответ своего же адреса, но всё равно снаружи кода — проверяем форму. */
export function isThumbList(value: unknown): value is ArtworkThumb[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.title === "string",
    )
  );
}

let pending: Promise<ArtworkThumb[]> | null = null;
let loaded: ArtworkThumb[] | null = null;

export function fetchArtworkThumbs(): Promise<ArtworkThumb[]> {
  pending ??= (async () => {
    const response = await fetch(artworkThumbsUrl);
    const data: unknown = response.ok ? await response.json() : null;
    if (!isThumbList(data)) throw new Error(`Список работ не получен: ${response.status}`);
    loaded = data;
    return data;
  })().catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}

/**
 * Уже загруженный список — сразу, без ожидания. Сетка «Все работы»
 * собирается заново на каждой странице работы, и без этого при каждом
 * переходе к соседней картине на миг мелькали бы серые заглушки.
 */
export function loadedArtworkThumbs(): ArtworkThumb[] | null {
  return loaded;
}

/**
 * Номер работы в порядке галереи (с единицы) и сколько их всего.
 * `null`, если работы в списке нет — например, её только что удалили,
 * а страница ещё открыта.
 */
export function positionOf(
  works: readonly { id: string }[],
  id: string,
): { position: number; total: number } | null {
  const index = works.findIndex((work) => work.id === id);
  return index === -1 ? null : { position: index + 1, total: works.length };
}
