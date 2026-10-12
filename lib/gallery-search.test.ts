import { describe, expect, it } from "vitest";

import {
  categoriesMatching,
  galleryHref,
  likePattern,
  maxSearchLength,
  normalizeSearch,
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

  it("держит и категорию, и запрос — поиск не теряется при смене категории", () => {
    const href = galleryHref("ru", { category: "Цветы", q: "ромашки" });
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("category")).toBe("Цветы");
    expect(params.get("q")).toBe("ромашки");
  });

  it("английская версия — со своей приставкой", () => {
    expect(galleryHref("en", { q: "towers" })).toBe("/en/gallery?q=towers");
  });
});
