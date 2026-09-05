import { cache } from "react";

import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ArtworkStatus } from "@/lib/generated/prisma/enums";

// Переэкспорт: страницы и компоненты не импортируют lib/generated напрямую
// (проверяется линтером, architecture.md) — им нужен только тип значения,
// а не сам сгенерированный модуль.
export type { ArtworkStatus };

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

/**
 * Подпись статуса словом. У доступной работы метки нет вовсе: подписывать
 * нормальное состояние незачем, метка нужна там, где картину уже не купить.
 *
 * Словом, а не только цветом, — требование доступности: серая карточка сама
 * по себе ничего не сообщает человеку, который не различает оттенки.
 */
const statusLabels: Record<ArtworkStatus, string | null> = {
  AVAILABLE: null,
  RESERVED: "Забронирована",
  SOLD: "Продана",
};

/** Метка статуса для витрины или `null`, если работу можно купить. */
export function artworkStatusLabel(status: ArtworkStatus): string | null {
  return statusLabels[status];
}

/**
 * Цена в рублях без копеек: «45 000 ₽». Разряды отбивает Intl, а не мы —
 * он же ставит неразрывный пробел, чтобы число не переносилось по строке.
 */
const priceFormat = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Цена для показа или `null`, если она не заполнена.
 *
 * Проверка именно на `null`, а не на истинность: `if (price)` спрятал бы
 * цену `0`. Правило «пустое поле не показываем» не должно втихую
 * превратиться в «дешёвое поле не показываем».
 */
export function formatPrice(price: number | null): string | null {
  if (price === null) return null;
  return priceFormat.format(price);
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

/**
 * Одна работа для страницы `/gallery/[id]`. `null`, если такой нет.
 *
 * Обёрнута в `cache()`: за одну и ту же работу страница ходит дважды —
 * из `generateMetadata` за названием вкладки и из самой разметки. Без
 * обёртки сборка пяти страниц делала бы десять запросов вместо пяти,
 * и разрыв рос бы вместе с числом картин.
 */
export const getArtworkById = cache(async (id: string): Promise<ArtworkWithImages | null> => {
  return db.artwork.findUnique({
    where: { id },
    include: withImages,
  });
});

/**
 * Другие работы — для блока внизу карточки.
 *
 * Отбор нарочно простой: все работы, кроме открытой. Вариант «похожие
 * по категории» отвергнут, пока картин мало: категорий три, работ пять,
 * и у «Дома с бирюзовыми ставнями» блок вышел бы пустым. Вернуться к нему
 * стоит работах на пятнадцати.
 *
 * Лишнюю работу отсекает база через `where`, а не страница через `.filter()`:
 * иначе при тридцати картинах страница качала бы всю базу ради четырёх
 * карточек.
 */
export async function getOtherArtworks(excludeId: string, limit = 4): Promise<ArtworkWithImages[]> {
  return db.artwork.findMany({
    where: { id: { not: excludeId } },
    include: withImages,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: limit,
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

/**
 * Список категорий для фильтра галереи — запросом `distinct`, а не строкой
 * в коде. Категория — свободный текст ([data.md](../.ai/rules/data.md)),
 * и художница заведёт новую через админку; фильтр обязан подхватить её сам,
 * а не ждать правки кода.
 */
export async function getCategories(): Promise<string[]> {
  const rows = await db.artwork.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  // `category` тут не может быть null — отфильтровано в `where`, но Prisma
  // не сужает тип по условию, поэтому проверка explicit.
  return rows.map((row) => row.category).filter((category) => category !== null);
}
