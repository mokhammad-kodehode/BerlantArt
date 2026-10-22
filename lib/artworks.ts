import { cache } from "react";

import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ArtworkStatus } from "@/lib/generated/prisma/enums";
import { likePattern } from "@/lib/gallery-search";
import { getDictionary, translateValue, type Locale } from "@/lib/i18n";
import { publicUrl } from "@/lib/r2";
import type { SitemapArtwork } from "@/lib/seo";

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
export function artworkCaption(
  work: Pick<ArtworkWithImages, "technique" | "dimensions">,
  lang: Locale = "ru",
): string {
  return [artworkTechnique(work.technique, lang), artworkDimensions(work.dimensions, lang)]
    .filter(Boolean)
    .join(" · ");
}

/** Техника на языке страницы: «Холст, масло» → «Oil on canvas». */
export function artworkTechnique(technique: string | null, lang: Locale = "ru"): string | null {
  if (technique === null) return null;
  return translateValue(getDictionary(lang).techniques, technique);
}

/**
 * Размер на языке страницы. В базе он строкой «40 × 40 см»: для английской
 * версии меняется только единица, числа остаются как ввела художница.
 */
export function artworkDimensions(dimensions: string | null, lang: Locale = "ru"): string | null {
  if (dimensions === null) return null;
  return lang === "ru" ? dimensions : dimensions.replace(/\s*см\.?\s*$/i, " cm");
}

/** Тексты картины для поисковиков: заголовок, описание, подпись картинки. */
export type ArtworkSeo = { title: string; description: string; imageAlt: string };

/**
 * Заголовок, описание и подпись картинки для выдачи — из того, что заполнено
 * в админке. Пустое поле не попадает в текст: нет размера — нет и размера
 * в заголовке (.ai/rules/content.md).
 *
 * «Картина маслом» — только если в технике есть масло: у художницы техника
 * всегда одна, но если когда-нибудь появится другая, заголовок не соврёт.
 * Цены и статуса в тексте нет: продажа на сайте выключена (ARCHITECTURE.md,
 * «Продажа выключена»), и поисковик не должен показывать цену, которой нет
 * на странице.
 */
export function artworkSeo(
  work: Pick<ArtworkWithImages, "title" | "description" | "technique" | "dimensions" | "year">,
  lang: Locale = "ru",
): ArtworkSeo {
  const t = getDictionary(lang);
  const kind = artworkKind(work.technique, lang);
  const size = artworkDimensions(work.dimensions, lang);
  const technique = artworkTechnique(work.technique, lang);

  // После двоеточия — со строчной: «Картина «Село»: холст, масло, 40 × 40 см».
  const details = [technique, size, work.year]
    .filter(Boolean)
    .join(", ")
    .replace(/^./, (letter) => letter.toLowerCase());

  const description = [
    t.seo.workDescription(work.title, details),
    t.seo.byArtist(t.site.artist),
    // Описание из админки — только по-русски (решение заказчика), поэтому
    // в английском тексте его нет.
    lang === "ru" ? work.description : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: t.seo.workTitle(work.title, kind, size),
    description,
    imageAlt: artworkImageAlt(work, lang),
  };
}

/** «Картина маслом» или просто «Картина» — по технике, а не наугад. */
function artworkKind(technique: string | null, lang: Locale): string {
  const t = getDictionary(lang);
  const isOil = technique !== null && /масл/i.test(technique);
  return isOil ? t.seo.oilPainting : t.seo.painting;
}

/**
 * Подпись картинки отдельно от остальных текстов для поисковика: плитке
 * галереи нужна только она, и выборке для плиток незачем тянуть описание.
 */
export function artworkImageAlt(
  work: Pick<ArtworkWithImages, "title" | "technique">,
  lang: Locale = "ru",
): string {
  const t = getDictionary(lang);
  return t.seo.imageAlt(work.title, artworkKind(work.technique, lang), t.site.artistGenitive);
}

/**
 * Плитка стены — всё, что нужно коллажу, и ничего сверх. Готовится здесь,
 * у выборки (.ai/rules/architecture.md): плитку рисует клиентский
 * компонент, и данные о работе ему передаются целиком в страницу — каждое
 * лишнее поле умножается на число работ.
 */
export type GalleryTile = {
  id: string;
  title: string;
  /** Техника и размер через «·»; пустая строка, если неизвестны. */
  caption: string;
  src?: string;
  alt: string;
  isLarge: boolean;
};

/** Из чего собирается плитка: и лёгкая выборка галереи, и полная работа. */
type TileSource = Pick<
  ArtworkWithImages,
  "id" | "title" | "technique" | "dimensions" | "isLarge"
> & { images: { url: string }[] };

export function galleryTile(work: TileSource, lang: Locale = "ru"): GalleryTile {
  // Выборки кладут главное изображение первым (withImages, tileSelect).
  const stored = work.images[0]?.url;
  return {
    id: work.id,
    title: work.title,
    caption: artworkCaption(work, lang),
    src: stored === undefined ? undefined : imageUrl(stored),
    alt: artworkImageAlt(work, lang),
    isLarge: work.isLarge,
  };
}

/** Категория на языке страницы; не из утверждённого списка — как есть. */
export function artworkCategory(category: string | null, lang: Locale = "ru"): string | null {
  if (category === null) return null;
  return translateValue(getDictionary(lang).categories, category);
}

/**
 * Цена в рублях без копеек: «45 000 ₽». Разряды отбивает Intl, а не мы —
 * он же ставит неразрывный пробел, чтобы число не переносилось по строке.
 */
const priceFormats: Record<Locale, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  // В рублях и в английской версии — решение заказчика от 4 октября 2026:
  // курс устаревает, а цена у художницы одна. Формат английский: «₽5,000».
  en: new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "RUB",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

/**
 * Цена для показа или `null`, если она не заполнена.
 *
 * Проверка именно на `null`, а не на истинность: `if (price)` спрятал бы
 * цену `0`. Правило «пустое поле не показываем» не должно втихую
 * превратиться в «дешёвое поле не показываем».
 */
export function formatPrice(price: number | null, lang: Locale = "ru"): string | null {
  if (price === null) return null;
  return priceFormats[lang].format(price);
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
 * Порядок работ в галерее: последние добавленные первыми, проданные —
 * вперемешку со всеми, по дате (заказчик, 12.10.2026). Прежде сначала
 * шли доступные: пока продажа на сайте выключена, статуса посетитель
 * не видит, и работа с пометкой «продана» молча уезжала в конец стены.
 * Тот же порядок у главной (`getFeatured`), поэтому стены совпадают.
 *
 * `id` — на случай двух работ с одной датой: без него база вправе
 * отдавать их то так, то эдак, и стрелка «дальше» прыгала бы.
 *
 * Вынесен в константу, потому что его должны разделять выборки — список,
 * главная, соседи для листания с панелью «Все работы» и карта сайта. Разойдись они,
 * стрелка «дальше» вела бы не на ту работу, которая стоит следующей в стене.
 */
const galleryOrder = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.ArtworkOrderByWithRelationInput[];

export type ArtworkFilters = {
  category?: string;
  technique?: string;
  status?: ArtworkStatus;
  /** Границы цены в рублях, включительно. */
  priceMin?: number;
  priceMax?: number;
  /** Поисковый запрос, уже приведённый `normalizeSearch` (lib/gallery-search.ts). */
  search?: string;
  /**
   * Категории, которые тоже считаются найденными по запросу, — их находит
   * по переводу английская версия (`categoriesMatching`).
   */
  searchCategories?: string[];
};

/**
 * Работы, у которых запрос есть в названии, описании или категории.
 *
 * Запрос написан вручную, потому что Prisma не умеет сравнивать «ё» с «е»:
 * `contains` с `mode: "insensitive"` не нашёл бы «Берёзу» по «береза».
 * Значение уходит параметром (тегированный шаблон $queryRaw), а не
 * склейкой строки — подставить в него свой SQL нельзя. Работ — десятки,
 * поэтому полный просмотр таблицы без индекса здесь дешевле индекса.
 */
async function searchArtworkIds(search: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Artwork"
    WHERE translate(
      lower("title" || ' ' || coalesce("description", '') || ' ' || coalesce("category", '')),
      'ё', 'е'
    ) LIKE ${likePattern(search)}
  `;
  return rows.map((row) => row.id);
}

/**
 * Список работ под фильтры галереи.
 *
 * Пустой фильтр означает «без ограничения», поэтому условия добавляются
 * только для заполненных полей: `where: { category: undefined }` Prisma
 * игнорирует, а `where: { category: "" }` вернул бы пусто.
 */
export async function getArtworks(filters: ArtworkFilters = {}): Promise<ArtworkWithImages[]> {
  return db.artwork.findMany({
    where: await galleryWhere(filters),
    include: withImages,
    orderBy: galleryOrder,
  });
}

/**
 * Условие выборки галереи — общее для полных работ и для плиток, чтобы
 * фильтр и поиск не разошлись между ними.
 */
async function galleryWhere(filters: ArtworkFilters): Promise<Prisma.ArtworkWhereInput> {
  const {
    category,
    technique,
    status,
    priceMin,
    priceMax,
    search,
    searchCategories = [],
  } = filters;

  const price =
    priceMin === undefined && priceMax === undefined ? undefined : { gte: priceMin, lte: priceMax };

  // Поиск — отдельным запросом за списком id: найденное дальше выбирается
  // тем же findMany, с теми же изображениями и порядком, что и без поиска.
  const found = search === undefined ? undefined : await searchArtworkIds(search);

  return {
    category: category || undefined,
    technique: technique || undefined,
    status,
    price,
    OR:
      found === undefined
        ? undefined
        : [{ id: { in: found } }, { category: { in: searchCategories } }],
  };
}

/**
 * Поля плитки: одно главное фото, без описания, цены и остальных фото.
 * На 203 работах полная выборка тянула все фото каждой работы, хотя
 * плитке нужно одно.
 */
const tileSelect = {
  id: true,
  title: true,
  technique: true,
  dimensions: true,
  isLarge: true,
  images: { select: { url: true }, orderBy: withImages.images.orderBy, take: 1 },
} satisfies Prisma.ArtworkSelect;

/** Плитки галереи под фильтр — лёгкая выборка для стены (тикет О-11). */
export async function getGalleryTiles(
  filters: ArtworkFilters = {},
  lang: Locale = "ru",
): Promise<GalleryTile[]> {
  const rows = await db.artwork.findMany({
    where: await galleryWhere(filters),
    select: tileSelect,
    orderBy: galleryOrder,
  });
  return rows.map((row) => galleryTile(row, lang));
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

/** Ссылка на соседнюю работу: больше странице для стрелки ничего не нужно. */
export type ArtworkLink = { id: string; title: string };

/** Работа для списка-выбора на странице работы: название и миниатюра. */
export type ArtworkThumb = ArtworkLink & { src?: string };

/** Соседи работы по кольцу галереи — для стрелок ‹ › на странице работы. */
export type ArtworkNeighbours = {
  prev: ArtworkLink | null;
  next: ArtworkLink | null;
  /** Сама работа, если она в списке, — для якоря «← Все работы» и панели выбора. */
  currentId: string | null;
};

/**
 * Соседи работы в списке, замкнутом в кольцо: с последней вперёд — на
 * первую. Так у стрелок нет выключенного состояния, а тупик в конце на
 * галерее из пяти работ раздражал бы сильнее, чем возврат к началу.
 * Одна работа сама себе не сосед — стрелок тогда нет вовсе.
 *
 * Чистая функция отдельно от запроса — ради тестов: ошибку в кольце на
 * глаз не видно, стрелка просто ведёт не туда.
 */
export function ringNeighbours<T extends { id: string }>(
  works: readonly T[],
  id: string,
): { prev: T | null; next: T | null } {
  const index = works.findIndex((work) => work.id === id);
  if (index === -1 || works.length < 2) return { prev: null, next: null };

  return {
    prev: works[(index - 1 + works.length) % works.length],
    next: works[(index + 1) % works.length],
  };
}

/**
 * Соседние работы в порядке галереи — для листания на странице работы.
 *
 * Берётся список одних только id и названий и в нём ищется позиция.
 * Двумя запросами «предыдущая и следующая» это не решается: курсор по
 * дате путается на работах, добавленных в одну секунду (пачкой через
 * seed или импорт). Один запрос на страницу при любом числе работ.
 *
 * Номера «129 / 203» здесь больше нет (тикет О-5, 22.10.2026): он
 * менялся у всех ~400 страниц с каждой новой работой, и все уходили на
 * пересборку — записи в кеш Vercel. Номер считает браузер по общему
 * списку `/api/artwork-thumbs` (ArtworkPosition). Соседи же меняются
 * только у двух-трёх работ рядом с новой — их обновляют экшены.
 */
export async function getArtworkNeighbours(id: string): Promise<ArtworkNeighbours> {
  const works: ArtworkLink[] = await db.artwork.findMany({
    select: { id: true, title: true },
    orderBy: galleryOrder,
  });
  const isListed = works.some((work) => work.id === id);

  return { ...ringNeighbours(works, id), currentId: isListed ? id : null };
}

/**
 * Все работы в порядке галереи с одной миниатюрой — для панели «Все
 * работы» (ArtworkPicker). Отдаётся файлом /api/artwork-thumbs, общим
 * для всех страниц: у каждой работы — только адрес главного фото.
 */
export async function getArtworkThumbs(): Promise<ArtworkThumb[]> {
  const rows = await db.artwork.findMany({
    select: {
      id: true,
      title: true,
      images: { select: { url: true }, orderBy: withImages.images.orderBy, take: 1 },
    },
    orderBy: galleryOrder,
  });

  return rows.map((row) => {
    const stored = row.images[0]?.url;
    return { id: row.id, title: row.title, src: stored ? imageUrl(stored) : undefined };
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
    orderBy: galleryOrder,
    take: limit,
  });
}

/**
 * Сколько работ в галерее всего. Главная сравнивает это число с тем,
 * сколько показала сама, и не зовёт «смотреть всю галерею», когда
 * там не найдётся ничего нового.
 */
export async function countArtworks(): Promise<number> {
  return db.artwork.count();
}

/**
 * Работы для карты сайта (app/sitemap.ts): адрес, дата правки и главное
 * фото. Один запрос на все работы, только нужные поля: карта сайта
 * открывается поисковиками часто, тащить описания и цены ей незачем.
 */
export async function getSitemapArtworks(): Promise<SitemapArtwork[]> {
  const rows = await db.artwork.findMany({
    orderBy: galleryOrder,
    select: {
      id: true,
      updatedAt: true,
      images: { orderBy: withImages.images.orderBy, take: 1, select: { url: true } },
    },
  });

  return rows.map((row) => {
    const stored = row.images[0]?.url;
    return { id: row.id, updatedAt: row.updatedAt, image: stored ? imageUrl(stored) : undefined };
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
  isLarge: boolean;
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

/**
 * Главное фото работы — первое в показе — или `null`, если фото нет.
 * Экшены сверяют его до и после правки: от главного фото зависят плитки
 * галереи, главная, общий список миниатюр и карта сайта, от остальных —
 * только страница самой работы (lib/revalidate.ts).
 */
export async function primaryImageId(artworkId: string): Promise<string | null> {
  const image = await db.image.findFirst({
    where: { artworkId },
    select: { id: true },
    orderBy: withImages.images.orderBy,
  });

  return image?.id ?? null;
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
  size,
}: {
  artworkId: string;
  key: string;
  alt: string;
  /** Размер из самого файла (`readImageSize`), не со слов браузера. */
  size: { width: number; height: number };
}): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const artwork = await tx.artwork.findUnique({ where: { id: artworkId }, select: { id: true } });
    if (artwork === null) return false;

    const count = await tx.image.count({ where: { artworkId } });

    await tx.image.create({
      data: {
        artworkId,
        url: key,
        alt,
        order: count,
        isPrimary: count === 0,
        width: size.width,
        height: size.height,
      },
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
