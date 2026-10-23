import type { ArtworkFeedItem } from "@/lib/artworks";

/**
 * Общий список работ в браузере — для ленты на странице работы
 * (ArtworkFeed): по нему дорисовываются остальные картины, миниатюры
 * и номер «12 / 204».
 *
 * Список отдаёт `/api/artwork-thumbs`, а не сама страница работы, — иначе
 * каждая новая картина меняла бы все ~400 страниц (тикет О-5,
 * lib/revalidate.ts). Обещание хранится на уровне модуля: при переходе
 * к другой работе внутри сайта модуль не перезагружается, и второй
 * запрос не уходит. Не вышло — забываем обещание, чтобы следующая
 * попытка пошла заново.
 *
 * Модуль только для браузера: на сервере тот же список даёт
 * `getArtworkFeed` из lib/artworks.ts.
 */

/** Адрес общего списка (app/api/artwork-thumbs/route.ts). */
export const artworkThumbsUrl = "/api/artwork-thumbs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Холст в сантиметрах — `{ width, height }`, оба положительные. */
function isCanvas(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    value.width > 0 &&
    value.height > 0
  );
}

/** Строка на обоих языках сайта — `{ ru, en }`. */
function isBilingual(value: unknown): boolean {
  return isRecord(value) && typeof value.ru === "string" && typeof value.en === "string";
}

/**
 * Ответ своего же адреса, но всё равно снаружи кода — проверяем форму.
 * Каждое поле, которое лента читает: старая копия файла в кеше браузера
 * (до 22.10.2026 в нём были только id, название и фото) иначе уронила бы
 * страницу на `label.ru` от undefined.
 */
export function isFeedList(value: unknown): value is ArtworkFeedItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        (item.src === undefined || typeof item.src === "string") &&
        (item.ratio === null || typeof item.ratio === "number") &&
        Array.isArray(item.extra) &&
        item.extra.every((url) => typeof url === "string") &&
        isBilingual(item.label) &&
        isBilingual(item.pageTitle) &&
        isBilingual(item.alt) &&
        (item.description === null || typeof item.description === "string") &&
        // Без поля — список, собранный до 23.10.2026: камеры и примерки
        // у такой картины просто нет, а лента цела.
        (item.arVersion === undefined ||
          item.arVersion === null ||
          typeof item.arVersion === "string") &&
        (item.canvas === undefined || item.canvas === null || isCanvas(item.canvas)) &&
        // Категория появилась 23.10.2026 («Повесить у себя»); без неё —
        // старая копия, и фильтр просто не знает категорию этой работы.
        (item.category === undefined || item.category === null || isBilingual(item.category)),
    )
  );
}

let pending: Promise<ArtworkFeedItem[]> | null = null;

export function fetchArtworkFeed(): Promise<ArtworkFeedItem[]> {
  pending ??= (async () => {
    const response = await fetch(artworkThumbsUrl);
    const data: unknown = response.ok ? await response.json() : null;
    if (!isFeedList(data)) throw new Error(`Список работ не получен: ${response.status}`);
    return data;
  })().catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
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
