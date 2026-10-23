import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addImage,
  countArtworks,
  createArtwork,
  deleteArtwork,
  deleteImage,
  getArtworkById,
  getArtworkFeed,
  getCategories,
  getFeatured,
  getGalleryTiles,
  getSitemapArtworks,
  moveImage,
  primaryImageId,
  setPrimaryImage,
  updateArtwork,
  type ArtworkInput,
} from "@/lib/artworks";
import { normalizeSearch } from "@/lib/gallery-search";
import { resetTestDatabase, testDatabase } from "@/lib/testing/test-db";

/**
 * Слой данных на настоящей базе (тикет О-17): то, где ошибку глазом не
 * видно — стрелка «дальше» ведёт не туда, у работы два главных фото или
 * ни одного, поиск находит лишнее. Временная база — lib/testing/test-db.ts.
 */

vi.mock("@/lib/db", async () => ({
  db: (await import("@/lib/testing/test-db")).testDatabase.db,
}));

const { db } = testDatabase;

beforeEach(resetTestDatabase);
afterAll(() => testDatabase.stop());

const blank: ArtworkInput = {
  title: "Без названия",
  description: null,
  category: null,
  technique: "Холст, масло",
  dimensions: null,
  year: null,
  price: null,
  status: "AVAILABLE",
  featured: false,
  isLarge: false,
};

/** Работа с нужным временем добавления — от него зависит порядок. */
async function work(fields: Partial<ArtworkInput> & { createdAt?: Date } = {}): Promise<string> {
  const { id } = await db.artwork.create({ data: { ...blank, ...fields }, select: { id: true } });
  return id;
}

const size = { width: 800, height: 600 };

/** Порядок фото работы и какое из них главное — как их видит посетитель. */
async function photos(artworkId: string): Promise<{ urls: string[]; primary: string[] }> {
  const rows = await db.image.findMany({
    where: { artworkId },
    orderBy: { order: "asc" },
    select: { url: true, order: true, isPrimary: true },
  });
  // Порядок обязан идти подряд с нуля: дыра в нём — признак сломанной
  // перенумерации.
  expect(rows.map((row) => row.order)).toEqual(rows.map((_, index) => index));
  return {
    urls: rows.map((row) => row.url),
    primary: rows.filter((row) => row.isPrimary).map((row) => row.url),
  };
}

async function photoId(url: string): Promise<string> {
  const image = await db.image.findFirstOrThrow({ where: { url }, select: { id: true } });
  return image.id;
}

describe("порядок работ", () => {
  it("последние первыми; при одинаковом времени — один порядок в галерее, ленте и карте сайта", async () => {
    const same = new Date("2026-10-20T12:00:00Z");
    const ids = {
      old: await work({ title: "Старая", createdAt: new Date("2026-10-01T12:00:00Z") }),
      twinA: await work({ title: "Близнец А", createdAt: same }),
      twinB: await work({ title: "Близнец Б", createdAt: same }),
      fresh: await work({ title: "Новая", createdAt: new Date("2026-10-22T12:00:00Z") }),
    };
    // Близнецы — по id в обратном порядке: так их ставит galleryOrder.
    const twins = [ids.twinA, ids.twinB].sort().reverse();
    const expected = [ids.fresh, ...twins, ids.old];

    const gallery = (await getGalleryTiles()).map((tile) => tile.id);
    const feed = (await getArtworkFeed()).map((item) => item.id);
    const sitemap = (await getSitemapArtworks()).map((entry) => entry.id);

    expect(gallery).toEqual(expected);
    expect(feed).toEqual(expected);
    expect(sitemap).toEqual(expected);
  });
});

describe("фото работы", () => {
  it("первое загруженное становится главным, следующие встают по очереди", async () => {
    const id = await work();
    expect(await addImage({ artworkId: id, key: "a.webp", alt: "А", size })).toBe(true);
    expect(await addImage({ artworkId: id, key: "b.webp", alt: "Б", size })).toBe(true);

    expect(await photos(id)).toEqual({ urls: ["a.webp", "b.webp"], primary: ["a.webp"] });
    expect(await addImage({ artworkId: "нет-такой", key: "c.webp", alt: "В", size })).toBe(false);
  });

  it("главное фото — первым в работе, плитке и ленте", async () => {
    const id = await work();
    for (const key of ["a.webp", "b.webp", "c.webp"]) {
      await addImage({ artworkId: id, key, alt: key, size });
    }
    expect(await setPrimaryImage(id, await photoId("c.webp"))).toBe(true);

    expect(await photos(id)).toEqual({ urls: ["c.webp", "a.webp", "b.webp"], primary: ["c.webp"] });
    expect((await getArtworkById(id))?.images.map((image) => image.url)).toEqual([
      "c.webp",
      "a.webp",
      "b.webp",
    ]);
    expect(await primaryImageId(id)).toBe(await photoId("c.webp"));

    const [tile] = await getGalleryTiles();
    expect(tile.src).toMatch(/c\.webp$/);
    const [item] = await getArtworkFeed();
    expect(item.src).toMatch(/c\.webp$/);
    expect(item.extra.map((url) => url.split("/").at(-1))).toEqual(["a.webp", "b.webp"]);
  });

  it("чужое фото главным не становится, порядок не меняется", async () => {
    const mine = await work();
    const other = await work();
    await addImage({ artworkId: mine, key: "mine.webp", alt: "", size });
    await addImage({ artworkId: other, key: "other.webp", alt: "", size });

    expect(await setPrimaryImage(mine, await photoId("other.webp"))).toBe(false);
    expect(await photos(mine)).toEqual({ urls: ["mine.webp"], primary: ["mine.webp"] });
    expect(await photos(other)).toEqual({ urls: ["other.webp"], primary: ["other.webp"] });
  });

  it("перестановка меняет местами с соседом; с краёв двигать некуда", async () => {
    const id = await work();
    for (const key of ["a.webp", "b.webp", "c.webp"]) {
      await addImage({ artworkId: id, key, alt: key, size });
    }

    expect(await moveImage(await photoId("a.webp"), "up")).toBe(false);
    expect(await moveImage(await photoId("c.webp"), "down")).toBe(false);

    // Второе вверх — оно же становится главным: главное — это первое.
    expect(await moveImage(await photoId("b.webp"), "up")).toBe(true);
    expect(await photos(id)).toEqual({ urls: ["b.webp", "a.webp", "c.webp"], primary: ["b.webp"] });

    expect(await moveImage(await photoId("a.webp"), "down")).toBe(true);
    expect(await photos(id)).toEqual({ urls: ["b.webp", "c.webp", "a.webp"], primary: ["b.webp"] });
  });

  it("удалили главное — главным становится следующее, дыр в порядке нет", async () => {
    const id = await work();
    for (const key of ["a.webp", "b.webp", "c.webp"]) {
      await addImage({ artworkId: id, key, alt: key, size });
    }

    expect(await deleteImage(await photoId("a.webp"))).toBe("a.webp");
    expect(await photos(id)).toEqual({ urls: ["b.webp", "c.webp"], primary: ["b.webp"] });

    expect(await deleteImage("нет-такого")).toBeNull();
  });
});

describe("фильтры и поиск галереи", () => {
  const titles = async (filters: Parameters<typeof getGalleryTiles>[0]) =>
    (await getGalleryTiles(filters)).map((tile) => tile.title).sort();

  it("категория отбирает только свои работы", async () => {
    await work({ title: "Ромашки", category: "Цветы" });
    await work({ title: "Мост", category: "Река и мост" });

    expect(await titles({ category: "Цветы" })).toEqual(["Ромашки"]);
    expect(await titles({})).toEqual(["Мост", "Ромашки"]);
  });

  it("поиск: регистр не важен, «е» находит «ё», ищет и в описании, и в категории", async () => {
    await work({ title: "Берёза в поле" });
    await work({ title: "Вечер", description: "Старая БЕРЁЗА у дома" });
    await work({ title: "Подсолнухи", category: "Цветы" });
    await work({ title: "Море" });

    expect(await titles({ search: normalizeSearch("береза") })).toEqual(["Берёза в поле", "Вечер"]);
    expect(await titles({ search: normalizeSearch("ЦВЕТЫ") })).toEqual(["Подсолнухи"]);
  });

  it("«%» и «_» в запросе — просто символы, а не шаблон", async () => {
    await work({ title: "Скидка 100%" });
    await work({ title: "Сто" });
    await work({ title: "a_b" });
    await work({ title: "axb" });

    expect(await titles({ search: normalizeSearch("100%") })).toEqual(["Скидка 100%"]);
    expect(await titles({ search: normalizeSearch("%") })).toEqual(["Скидка 100%"]);
    expect(await titles({ search: normalizeSearch("a_b") })).toEqual(["a_b"]);
  });

  it("английский запрос находит работы по переведённой категории", async () => {
    await work({ title: "Ромашки", category: "Цветы" });
    await work({ title: "Мост", category: "Река и мост" });

    // «flowers» в названиях нет — работу находит категория из перевода
    // (categoriesMatching на странице галереи).
    expect(await titles({ search: "flowers", searchCategories: ["Цветы"] })).toEqual(["Ромашки"]);
  });

  it("список категорий — без пустых и без повторов, по алфавиту", async () => {
    await work({ category: "Цветы" });
    await work({ category: "Башни" });
    await work({ category: "Цветы" });
    await work({ category: null });

    expect(await getCategories()).toEqual(["Башни", "Цветы"]);
  });
});

describe("главная, правка и удаление", () => {
  it("на главной — только отмеченные, последние первыми и не больше лимита", async () => {
    await work({ title: "Обычная", createdAt: new Date("2026-10-23T00:00:00Z") });
    for (const day of [10, 11, 12]) {
      await work({
        title: `Отмеченная ${day}`,
        featured: true,
        createdAt: new Date(`2026-10-${day}`),
      });
    }

    expect((await getFeatured(2)).map((work) => work.title)).toEqual([
      "Отмеченная 12",
      "Отмеченная 11",
    ]);
    expect(await countArtworks()).toBe(4);
  });

  it("правка несуществующей работы отвечает «нет», существующей — меняет поля", async () => {
    expect(await updateArtwork("нет-такой", blank)).toBe(false);

    const id = await createArtwork(blank);
    expect(await updateArtwork(id, { ...blank, title: "Новое имя" })).toBe(true);
    expect((await getArtworkById(id))?.title).toBe("Новое имя");
  });

  it("удаление работы убирает и её фото и отдаёт ключи файлов для хранилища", async () => {
    const id = await work();
    await addImage({ artworkId: id, key: "a.webp", alt: "", size });
    await addImage({ artworkId: id, key: "b.webp", alt: "", size });

    expect((await deleteArtwork(id))?.sort()).toEqual(["a.webp", "b.webp"]);
    expect(await db.image.count()).toBe(0);
    expect(await deleteArtwork(id)).toBeNull();
  });
});
