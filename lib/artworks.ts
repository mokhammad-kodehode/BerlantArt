import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ArtworkStatus } from "@/lib/generated/prisma/enums";

/**
 * Выборки работ из базы.
 *
 * Страницы не пишут запросы к Prisma сами — они зовут функции отсюда.
 * Причина: когда запросы разбросаны по страницам, любое изменение модели
 * приходится искать по всему проекту, а одинаковые выборки незаметно
 * расходятся между собой.
 *
 * Вся фильтрация идёт в базу через `where`. Тянуть все работы и отсеивать
 * их в браузере нельзя: с ростом числа картин страница будет качать
 * мегабайты ради десятка карточек.
 */

/**
 * Изображения к работе: сначала главное, дальше в заданном художницей
 * порядке. Один и тот же порядок нужен и в галерее, и в карточке, поэтому
 * он описан один раз здесь.
 */
const withImages = {
  images: {
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
  },
} satisfies Prisma.ArtworkInclude;

/** Работа вместе с её изображениями — то, что получают страницы. */
export type ArtworkWithImages = Prisma.ArtworkGetPayload<{ include: typeof withImages }>;

/**
 * Подпись под работой: техника и размеры через разделитель.
 *
 * Живёт рядом с выборкой, а не в разметке: приводить данные к виду для
 * показа — работа слоя данных, иначе одна страница покажет «Холст, масло ·
 * 60 × 80 см», а другая забудет разделитель.
 *
 * Пустые поля молча пропускаются. Размеры холстов пока неизвестны ни у одной
 * работы, и в подписи не должно появиться ни «undefined», ни висящей точки:
 * карточка работы — карточка товара, врать в ней о габаритах нельзя.
 */
export function artworkCaption(work: Pick<ArtworkWithImages, "technique" | "dimensions">): string {
  return [work.technique, work.dimensions].filter(Boolean).join(" · ");
}

/** Адрес главного изображения работы или `undefined`, если фотографий нет. */
export function primaryImageUrl(work: ArtworkWithImages): string | undefined {
  // Выборка кладёт главное изображение первым, поэтому искать не нужно.
  return work.images[0]?.url;
}

export type ArtworkFilters = {
  category?: string;
  technique?: string;
  status?: ArtworkStatus;
  /** Границы цены в рублях, включительно. */
  priceMin?: number;
  priceMax?: number;
};

/**
 * Список работ под фильтры галереи.
 *
 * Пустой фильтр означает «без ограничения», поэтому условия добавляются
 * только для заполненных полей: `where: { category: undefined }` Prisma
 * игнорирует, а `where: { category: "" }` вернул бы пусто.
 */
export async function getArtworks(filters: ArtworkFilters = {}): Promise<ArtworkWithImages[]> {
  const { category, technique, status, priceMin, priceMax } = filters;

  const price =
    priceMin === undefined && priceMax === undefined ? undefined : { gte: priceMin, lte: priceMax };

  return db.artwork.findMany({
    where: {
      category: category || undefined,
      technique: technique || undefined,
      status,
      price,
    },
    include: withImages,
    // Сначала доступные, потом новые: проданные работы не должны занимать
    // первый экран галереи.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

/** Одна работа для страницы `/gallery/[id]`. `null`, если такой нет. */
export async function getArtworkById(id: string): Promise<ArtworkWithImages | null> {
  return db.artwork.findUnique({
    where: { id },
    include: withImages,
  });
}

/**
 * Работы для главной страницы. Отбор ручной — по флагу `featured`, который
 * художница ставит в админке. «Последние добавленные» тут не годятся:
 * на первом экране должны стоять сильнейшие вещи, а не свежие.
 */
export async function getFeatured(limit = 6): Promise<ArtworkWithImages[]> {
  return db.artwork.findMany({
    where: { featured: true },
    include: withImages,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
