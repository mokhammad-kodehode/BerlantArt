import { describe, expect, it } from "vitest";

import type { ArtworkFeedItem } from "@/lib/artworks";
import {
  filterFittingWorks,
  fittingCategories,
  fittingUrl,
  fittingWork,
  fittingWorks,
  hangUrl,
  parseHangWork,
} from "@/lib/fitting-works";
import { defaultFrameChoice, type FrameChoice } from "@/lib/room-options";

const item = (patch: Partial<ArtworkFeedItem> & { id: string }): ArtworkFeedItem => ({
  title: "Башня",
  src: `/artworks/${patch.id}.jpg`,
  ratio: 1,
  extra: [],
  label: { ru: "", en: "" },
  pageTitle: { ru: "", en: "" },
  alt: { ru: "«Башня» — картина", en: "“Tower” — painting" },
  description: null,
  canvas: { width: 50, height: 50 },
  arVersion: null,
  category: { ru: "Башни", en: "Towers" },
  ...patch,
});

const list = [
  item({ id: "a" }),
  item({
    id: "b",
    title: "Ёлки у реки",
    category: { ru: "Деревья и лес", en: "Trees and forest" },
  }),
  item({ id: "c", title: "Город", category: null }),
  // Без размера холста и без фото — их в списке примерочной нет.
  item({ id: "d", canvas: null }),
  item({ id: "e", src: undefined }),
];

describe("fittingWorks — что можно примерить", () => {
  it("только работы с фото и размером холста, в порядке галереи", () => {
    expect(fittingWorks(list, "ru").map((work) => work.id)).toEqual(["a", "b", "c"]);
  });

  it("подписи — на языке страницы, ключ категории — по-русски", () => {
    const work = fittingWork(list[0], "en");
    expect(work?.alt).toBe("“Tower” — painting");
    expect(work?.category).toBe("Башни");
    expect(work?.categoryLabel).toBe("Towers");
  });

  it("копия списка до 23.10.2026 (без камеры и категории) не роняет примерочную", () => {
    const old = { ...list[0], arVersion: undefined, category: undefined };
    // Так выглядит старый файл из кеша браузера: полей просто нет.
    const work = fittingWork(old as unknown as ArtworkFeedItem, "ru");
    expect(work?.arVersion).toBeNull();
    expect(work?.category).toBeNull();
  });
});

describe("fittingCategories и filterFittingWorks — фильтр списка", () => {
  const works = fittingWorks(list, "ru");

  it("категории без повторов и пустых, по алфавиту", () => {
    expect(fittingCategories(works, "ru")).toEqual([
      { key: "Башни", label: "Башни" },
      { key: "Деревья и лес", label: "Деревья и лес" },
    ]);
  });

  it("по категории и по слову из названия; «ё» и «е» — одно и то же", () => {
    const ids = (category: string | null, query: string) =>
      filterFittingWorks(works, { category, query }).map((work) => work.id);
    expect(ids(null, "")).toEqual(["a", "b", "c"]);
    expect(ids("Башни", "")).toEqual(["a"]);
    expect(ids(null, "  елки ")).toEqual(["b"]);
    expect(ids("Башни", "ёлки")).toEqual([]);
  });
});

describe("адрес «Повесить у себя»", () => {
  const thin: FrameChoice = { frame: "thin", finish: "gold" };

  it("работа и рама — в адресе, чтобы ссылка открывала то же самое", () => {
    expect(hangUrl("ru", null, defaultFrameChoice)).toBe("/hang");
    expect(hangUrl("en", "cmvam3r8o", defaultFrameChoice)).toBe("/en/hang?work=cmvam3r8o");
    expect(hangUrl("ru", "cmvam3r8o", thin)).toMatch(/^\/hang\?work=cmvam3r8o&frame=thin/);
  });

  it("мусор в адресе — «ничего не выбрано», а не ошибка", () => {
    expect(parseHangWork("?work=cmvam3r8o000s06l0tr4byr1y")).toBe("cmvam3r8o000s06l0tr4byr1y");
    expect(parseHangWork("?work=../admin")).toBeNull();
    expect(parseHangWork("?work=")).toBeNull();
    expect(parseHangWork("")).toBeNull();
  });

  it("со страницы работы — адрес её примерочной, из меню — /hang", () => {
    expect(fittingUrl("work", "ru", "abc", defaultFrameChoice)).toBe("/gallery/abc/room");
    expect(fittingUrl("hang", "ru", "abc", defaultFrameChoice)).toBe("/hang?work=abc");
    expect(fittingUrl("hang", "ru", null, defaultFrameChoice)).toBe("/hang");
  });
});
