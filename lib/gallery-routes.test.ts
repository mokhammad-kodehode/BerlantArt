import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { artworkCategories } from "@/lib/artwork-form";
import {
  categoryBySlug,
  categorySlug,
  categorySlugs,
  galleryRedirects,
} from "@/lib/gallery-routes";

const appDir = path.join(import.meta.dirname, "..", "app");

/** Так Next проверяет условие перенаправления: значение целиком, с якорями. */
const matches = (pattern: string, value: string): boolean => new RegExp(`^${pattern}$`).test(value);

describe("categorySlugs", () => {
  it("у каждой категории из списка свой адрес, без повторов", () => {
    const slugs = artworkCategories.map((category) => categorySlugs[category]);
    expect(slugs.every(Boolean)).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("адреса — латиница: кириллица в пути роняла переход по ссылке", () => {
    for (const slug of Object.values(categorySlugs)) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("категория по адресу и обратно; чужое — ничего", () => {
    for (const category of artworkCategories) {
      expect(categoryBySlug(categorySlugs[category])).toBe(category);
      expect(categorySlug(category)).toBe(categorySlugs[category]);
    }
    expect(categoryBySlug("nope")).toBeUndefined();
    expect(categorySlug("Пейзаж")).toBeUndefined();
  });
});

describe("galleryRedirects", () => {
  const redirects = galleryRedirects();

  it("на каждом языке поиск идёт первым, за ним по одному перенаправлению на категорию", () => {
    for (const source of ["/gallery", "/en/gallery"]) {
      const own = redirects.filter((redirect) => redirect.source === source);
      expect(own[0].has[0].key).toBe("q");
      expect(own).toHaveLength(1 + artworkCategories.length);
    }
  });

  it("ведут на существующие страницы, адреса без кириллицы, перенаправления временные", () => {
    for (const { destination, permanent } of redirects) {
      expect(permanent).toBe(false);
      expect(destination).toMatch(/^[\x21-\x7e]+$/);
      const file = destination.endsWith("/search")
        ? path.join("search", "page.tsx")
        : path.join("category", "[category]", "page.tsx");
      const group = destination.startsWith("/en/")
        ? path.join("(en)", "en", "gallery", "(list)")
        : path.join("(ru)", "gallery", "(list)");
      expect(existsSync(path.join(appDir, group, file)), destination).toBe(true);
    }
  });

  it("категория совпадает только сама с собой, целиком", () => {
    const flowers = redirects.find((r) => r.destination === "/gallery/category/flowers");
    const pattern = flowers?.has[0].value ?? "";
    expect(matches(pattern, "Цветы")).toBe(true);
    expect(matches(pattern, "Цветы и травы")).toBe(false);
    expect(matches(pattern, "цветы")).toBe(false);

    const trees = redirects.find((r) => r.destination === "/gallery/category/trees-and-forest");
    expect(matches(trees?.has[0].value ?? "", "Деревья и лес")).toBe(true);
  });

  it("на поиск — только если в запросе есть что-то кроме пробелов", () => {
    const pattern = redirects[0].has[0].value;
    expect(matches(pattern, "берёза")).toBe(true);
    expect(matches(pattern, "  роза  ")).toBe(true);
    expect(matches(pattern, "")).toBe(false);
    expect(matches(pattern, "   ")).toBe(false);
  });
});
