import { describe, expect, it } from "vitest";

import {
  categoriesMatching,
  galleryHref,
  likePattern,
  maxSearchLength,
  normalizeSearch,
  parseGalleryQuery,
} from "@/lib/gallery-search";

describe("normalizeSearch", () => {
  it("убирает лишние пробелы и приводит к строчным", () => {
    expect(normalizeSearch("  Мост   на  ЗАКАТЕ ")).toBe("мост на закате");
  });

  it("считает «ё» буквой «е» — иначе «береза» не найдёт «Берёзу»", () => {
    expect(normalizeSearch("Берёза")).toBe("береза");
    expect(normalizeSearch("ЁЛКИ")).toBe("елки");
  });

  it("пустой и из одних пробелов запрос — не запрос", () => {
    expect(normalizeSearch(undefined)).toBeUndefined();
    expect(normalizeSearch("")).toBeUndefined();
    expect(normalizeSearch("   ")).toBeUndefined();
  });

  it("обрезает слишком длинный запрос", () => {
    expect(normalizeSearch("а".repeat(500))).toHaveLength(maxSearchLength);
  });
});

describe("likePattern", () => {
  it("ищет запрос в любом месте текста", () => {
    expect(likePattern("мост")).toBe("%мост%");
  });

  it("экранирует знаки шаблона, чтобы они искались как есть", () => {
    // Без этого «100%» нашёл бы всё, что начинается на «100», а «_» — любую букву.
    expect(likePattern("100%")).toBe("%100\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("c\\d")).toBe("%c\\\\d%");
  });
});

describe("categoriesMatching", () => {
  const english: Record<string, string> = { Цветы: "Flowers", Башни: "Towers" };

  it("находит категорию по переводу", () => {
    expect(categoriesMatching("flow", ["Цветы", "Башни"], (c) => english[c] ?? null)).toEqual([
      "Цветы",
    ]);
  });

  it("без совпадений — пусто, а не все категории", () => {
    expect(categoriesMatching("sea", ["Цветы", "Башни"], (c) => english[c] ?? null)).toEqual([]);
  });
});

describe("galleryHref", () => {
  it("без выбора — просто галерея", () => {
    expect(galleryHref("ru", {})).toBe("/gallery");
  });

  it("только категория — её готовая страница, латиницей (тикет О-11)", () => {
    expect(galleryHref("ru", { category: "Цветы" })).toBe("/gallery/category/flowers");
    expect(galleryHref("en", { category: "Деревья и лес" })).toBe(
      "/en/gallery/category/trees-and-forest",
    );
  });

  it("запрос с категорией — поиск, и ни то ни другое не теряется", () => {
    const href = galleryHref("ru", { category: "Цветы", q: "ромашки" });
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/gallery/search");
    expect(url.searchParams.get("category")).toBe("flowers");
    expect(url.searchParams.get("q")).toBe("ромашки");
  });

  it("категория не из списка — через поиск, а не на несуществующую страницу", () => {
    expect(galleryHref("ru", { category: "Пейзаж" })).toBe(
      "/gallery/search?category=%D0%9F%D0%B5%D0%B9%D0%B7%D0%B0%D0%B6",
    );
  });

  it("английская версия — со своей приставкой", () => {
    expect(galleryHref("en", { q: "towers" })).toBe("/en/gallery/search?q=towers");
  });
});

describe("parseGalleryQuery", () => {
  it("повторённый параметр — первое значение, а не падение", () => {
    expect(parseGalleryQuery({ category: ["Цветы", "Море"], q: ["роза", "мак"] })).toEqual({
      category: "Цветы",
      q: "роза",
    });
  });

  it("категория латинским адресом и названием из старой ссылки — одна и та же", () => {
    expect(parseGalleryQuery({ category: "flowers" }).category).toBe("Цветы");
    expect(parseGalleryQuery({ category: "Цветы" }).category).toBe("Цветы");
  });

  it("пустая категория — без фильтра; прочие параметры не читаются", () => {
    expect(parseGalleryQuery({ category: "", status: "SOLD" })).toEqual({
      category: undefined,
      q: undefined,
    });
  });
});
