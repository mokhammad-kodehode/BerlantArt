import { cache } from "react";

import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ArtworkStatus } from "@/lib/generated/prisma/enums";
import { publicUrl } from "@/lib/r2";

// Переэкспорт: страницы и компоненты не импортируют lib/generated напрямую
// (проверяется линтером, architecture.md) — им нужен только тип значения,
// а не сам сгенерированный модуль.
export type { ArtworkStatus };

/**
 * Работа с таблицей работ: выборки внизу файла, запись — в конце.
 *
 * Страницы и Server Action'ы не пишут запросы к Prisma сами — они зовут
 * функции отсюда.
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

/**
 * Адрес изображения для разметки.
 *
 * В базе лежит либо путь внутри `public/` (пять старых работ), либо ключ
 * объекта в хранилище — различаем по ведущему слэшу. Полный адрес не
 * хранится намеренно: тогда смена хранилища стоит одной переменной
 * окружения, а не переписывания всех строк в базе.
 *
 * `undefined`, если домен бакета не задан: страница в этом случае рисует
 * заглушку вместо того, чтобы упасть целиком.
 */
export function imageUrl(stored: string): string | undefined {
  if (stored.startsWith("/")) return stored;
  return publicUrl(stored);
}

/** Адрес главного изображения работы или `undefined`, если фотографий нет. */
export function primaryImageUrl(work: ArtworkWithImages): string | undefined {
  // Выборка кладёт главное изображение первым, поэтому искать не нужно.
  const stored = work.images[0]?.url;
  return stored === undefined ? undefined : imageUrl(stored);
}

/**
 * Порядок работ в галерее: сначала доступные, потом новые. Вынесен
 * в константу, потому что его должны разделять три выборки — список,
 * «другие работы» и соседи для листания. Разойдись они, стрелка «дальше»
 * вела бы не на ту работу, которая стоит следующей в стене.
 */
const galleryOrder = [
  { status: "asc" },
  { createdAt: "desc" },
] satisfies Prisma.ArtworkOrderByWithRelationInput[];

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
    orderBy: galleryOrder,
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
    orderBy: galleryOrder,
    take: limit,
  });
}

/** Ссылка на соседнюю работу: больше странице для стрелки ничего не нужно. */
export type ArtworkLink = { id: string; title: string };

/**
 * Соседние работы в порядке галереи — для листания стрелками на странице
 * работы.
 *
 * Берётся список одних только id и названий, без изображений и описаний,
 * и в нём ищется позиция. Двумя запросами «предыдущая и следующая» это
 * не решается: сортировка составная (статус, потом дата), и курсор по
 * одному полю даёт неверных соседей — а ошибку такого рода на глаз
 * не видно, стрелка просто ведёт не туда.
 *
 * Листание замкнуто в кольцо: с последней работы вперёд — на первую.
 * Так у стрелок нет выключенного состояния, а тупик в конце на галерее
 * из пяти работ раздражал бы сильнее, чем возврат к началу.
 */
export async function getArtworkNeighbours(
  id: string,
): Promise<{ prev: ArtworkLink | null; next: ArtworkLink | null }> {
  const works = await db.artwork.findMany({
    select: { id: true, title: true },
    orderBy: galleryOrder,
  });

  const index = works.findIndex((work) => work.id === id);

  // Одна работа сама себе не сосед: стрелки в таком случае не нужны вовсе.
  if (index === -1 || works.length < 2) return { prev: null, next: null };

  return {
    prev: works[(index - 1 + works.length) % works.length],
    next: works[(index + 1) % works.length],
  };
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

/**
 * Поля работы, которые задаёт человек в админке.
 *
 * Без `id`, `createdAt` и изображений: их задаёт не форма. Необязательные
 * поля — именно `null`, а не `undefined`: разница существенна для Prisma,
 * `undefined` означает «не трогать это поле», а `null` — «очистить».
 * Форма всегда присылает все поля, поэтому пустое должно стирать прежнее
 * значение, а не оставлять его.
 */
export type ArtworkInput = {
  title: string;
  description: string | null;
  category: string | null;
  technique: string | null;
  dimensions: string | null;
  year: number | null;
  price: number | null;
  status: ArtworkStatus;
  featured: boolean;
};

/** Создаёт работу и возвращает её идентификатор — он нужен, чтобы сразу
 * перейти на страницу редактирования и добавить фотографии. */
export async function createArtwork(input: ArtworkInput): Promise<string> {
  const created = await db.artwork.create({
    data: input,
    select: { id: true },
  });

  return created.id;
}

/**
 * Обновляет работу. `false`, если работы с таким идентификатором нет.
 *
 * Через `updateMany`, а не `update`: тот бросает исключение с кодом
 * `P2025`, и на вызывающей стороне пришлось бы разбирать код ошибки
 * Prisma, чтобы отличить «нет такой работы» от настоящей поломки базы.
 * Число изменённых строк отвечает на тот же вопрос без исключений.
 */
export async function updateArtwork(id: string, input: ArtworkInput): Promise<boolean> {
  const { count } = await db.artwork.updateMany({
    where: { id },
    data: input,
  });

  return count === 1;
}

/* ─── изображения работы ───────────────────────────────────────────────
 *
 * У всех функций ниже общее правило: **главное изображение — всегда
 * первое**. Схема хранит отдельный флаг `isPrimary`, и соблазн велик
 * считать порядок и «главность» независимыми — но тогда художница
 * расставит фотографии 1-2-3, отметит главной третью, и посетитель
 * увидит 3-1-2. Объяснить это невозможно, поэтому «сделать главной»
 * означает «поставить первой», и обе величины меняются вместе.
 *
 * Все изменения идут транзакцией. Без неё два быстрых нажатия оставляют
 * работу с двумя главными изображениями или с дырой в порядке.
 */

/**
 * Переписывает поле `order` подряд: 0, 1, 2…
 *
 * Нужно потому, что `order` в базе не уникален и у старых записей везде
 * стоит 0. Сортировать по полю с повторами — значит получать разный
 * порядок от запроса к запросу; перенумерация после каждой правки
 * делает поле честным.
 */
async function renumber(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, index) =>
      tx.image.update({ where: { id }, data: { order: index, isPrimary: index === 0 } }),
    ),
  );
}

/** Идентификаторы изображений работы в текущем порядке показа. */
async function orderedIds(tx: Prisma.TransactionClient, artworkId: string): Promise<string[]> {
  const rows = await tx.image.findMany({
    where: { artworkId },
    select: { id: true },
    // createdAt вторым ключом: при одинаковом order порядок должен быть
    // хоть каким-то постоянным, иначе перенумерация будет каждый раз
    // раскладывать фотографии по-новому.
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((row) => row.id);
}

/**
 * Заводит запись об изображении. `false`, если работы не существует.
 *
 * Первое изображение становится главным само: работа без главного
 * изображения показывается в галерее пустой плиткой, а помнить про
 * этот флажок при каждой первой загрузке — не работа человека.
 */
export async function addImage({
  artworkId,
  key,
  alt,
}: {
  artworkId: string;
  key: string;
  alt: string;
}): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const artwork = await tx.artwork.findUnique({ where: { id: artworkId }, select: { id: true } });
    if (artwork === null) return false;

    const count = await tx.image.count({ where: { artworkId } });

    await tx.image.create({
      data: { artworkId, url: key, alt, order: count, isPrimary: count === 0 },
    });

    return true;
  });
}

/**
 * Удаляет запись и возвращает ключ объекта, чтобы вызывающий убрал файл
 * из хранилища. `null`, если такой записи нет.
 *
 * Сам файл отсюда не удаляется: этот слой знает про базу и не знает про
 * хранилище (.ai/rules/architecture.md). Удалить объект — дело экшена.
 */
export async function deleteImage(imageId: string): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const image = await tx.image.findUnique({
      where: { id: imageId },
      select: { url: true, artworkId: true },
    });
    if (image === null) return null;

    await tx.image.delete({ where: { id: imageId } });

    // Удалили главное — главным становится следующее. Иначе у работы
    // не останется ни одного главного, и в галерее она опустеет.
    await renumber(tx, await orderedIds(tx, image.artworkId));

    return image.url;
  });
}

/** Куда двигать изображение в списке. */
export type ImageDirection = "up" | "down";

/**
 * Меняет изображение местами с соседним. `false`, если двигать некуда
 * или изображения нет.
 */
export async function moveImage(imageId: string, direction: ImageDirection): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const image = await tx.image.findUnique({
      where: { id: imageId },
      select: { artworkId: true },
    });
    if (image === null) return false;

    const ids = await orderedIds(tx, image.artworkId);
    const from = ids.indexOf(imageId);
    const to = direction === "up" ? from - 1 : from + 1;

    if (from < 0 || to < 0 || to >= ids.length) return false;

    [ids[from], ids[to]] = [ids[to], ids[from]];
    await renumber(tx, ids);

    return true;
  });
}

/**
 * Делает изображение главным — то есть ставит его первым.
 * `false`, если изображения нет или оно от другой работы.
 */
export async function setPrimaryImage(artworkId: string, imageId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const image = await tx.image.findUnique({
      where: { id: imageId },
      select: { artworkId: true },
    });

    // Проверка принадлежности обязательна: идентификатор приходит
    // из браузера, и без неё чужое изображение стало бы главным
    // у этой работы.
    if (image === null || image.artworkId !== artworkId) return false;

    const ids = await orderedIds(tx, artworkId);
    await renumber(tx, [imageId, ...ids.filter((id) => id !== imageId)]);

    return true;
  });
}

/** Меняет текст для скринридера. `false`, если изображения нет. */
export async function updateImageAlt(imageId: string, alt: string): Promise<boolean> {
  const { count } = await db.image.updateMany({ where: { id: imageId }, data: { alt } });
  return count === 1;
}

/** Работа, которой принадлежит изображение, — чтобы экшен знал, какую
 * страницу обновлять. `null`, если изображения нет. */
export async function artworkIdOfImage(imageId: string): Promise<string | null> {
  const image = await db.image.findUnique({
    where: { id: imageId },
    select: { artworkId: true },
  });

  return image?.artworkId ?? null;
}

/** Фильтры рабочего списка в админке. */
export type AdminArtworkFilters = {
  /** Подстрока названия. Регистр не важен. */
  search?: string;
  status?: ArtworkStatus;
};

/**
 * Все работы для списка в админке.
 *
 * Отдельно от `getArtworks`, а не флагом к ней, по двум причинам. Порядок:
 * витрина ставит вперёд доступные, а в рабочем списке это мешает —
 * художница ищет то, что добавила последней. И поиск по названию, который
 * витрине не нужен вовсе.
 *
 * `mode: "insensitive"` обязателен: без него «башни» не найдёт «Башни
 * в тумане». Для кириллицы это заметнее, чем для латиницы, — заглавная
 * буква в начале названия есть почти всегда.
 *
 * Индекса по названию нет: при поиске база перебирает таблицу целиком.
 * На десятках работ это доли миллисекунды; задуматься стоит сотен на пять.
 */
export async function getArtworksForAdmin(
  filters: AdminArtworkFilters = {},
): Promise<ArtworkWithImages[]> {
  const search = filters.search?.trim();

  return db.artwork.findMany({
    where: {
      status: filters.status,
      title: search ? { contains: search, mode: "insensitive" } : undefined,
    },
    include: withImages,
    orderBy: { createdAt: "desc" },
  });
}

/** Сводка для первого экрана админки. */
export type AdminSummary = {
  /** Сколько работ в каждом статусе; статус без работ — ноль, а не пропуск. */
  counts: Record<ArtworkStatus, number>;
  total: number;
  /** Последние добавленные — то, что художница, скорее всего, дописывает. */
  recent: ArtworkWithImages[];
};

/**
 * Счётчики по статусам и последние работы.
 *
 * Счётчики — один `groupBy`, а не три `count`: запросов на страницу два
 * при любом числе работ. Статус, у которого работ нет, `groupBy` не вернёт
 * вовсе — поэтому все три заводятся нулями заранее, иначе на экране
 * вместо «Продано: 0» было бы пусто.
 */
export async function getAdminSummary(recentLimit = 5): Promise<AdminSummary> {
  const [groups, recent] = await Promise.all([
    db.artwork.groupBy({ by: ["status"], _count: { _all: true } }),
    db.artwork.findMany({
      include: withImages,
      orderBy: { createdAt: "desc" },
      take: recentLimit,
    }),
  ]);

  const counts: Record<ArtworkStatus, number> = { AVAILABLE: 0, RESERVED: 0, SOLD: 0 };
  for (const group of groups) counts[group.status] = group._count._all;

  const total = counts.AVAILABLE + counts.RESERVED + counts.SOLD;

  return { counts, total, recent };
}

/** Сменить статус одной работы. `false`, если её нет. */
export async function setArtworkStatus(id: string, status: ArtworkStatus): Promise<boolean> {
  const { count } = await db.artwork.updateMany({ where: { id }, data: { status } });
  return count === 1;
}

/**
 * Удаляет работу и возвращает ключи её файлов, чтобы вызывающий убрал их
 * из хранилища. `null`, если работы нет.
 *
 * Ключи собираются **до** удаления и в одной транзакции с ним: изображения
 * уходят каскадом (`onDelete: Cascade` в схеме), и после `delete` спросить,
 * какие файлы принадлежали работе, уже не у кого.
 *
 * Сами файлы отсюда не удаляются: слой знает про базу и не знает про
 * хранилище. Убрать объекты — дело экшена.
 */
export async function deleteArtwork(id: string): Promise<string[] | null> {
  return db.$transaction(async (tx) => {
    const artwork = await tx.artwork.findUnique({
      where: { id },
      select: { images: { select: { url: true } } },
    });
    if (artwork === null) return null;

    await tx.artwork.delete({ where: { id } });

    return artwork.images.map((image) => image.url);
  });
}
