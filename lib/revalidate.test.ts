import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";

import {
  artworkThumbsPath,
  galleryCategoryPaths,
  publicPaths,
  sitemapPath,
  revalidateAfterImageChange,
  revalidateArtworkPage,
  revalidateSharedPages,
} from "@/lib/revalidate";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const appDir = path.join(import.meta.dirname, "..", "app");

/** Папки маршрута по адресу: `/en/gallery` → ищем page.tsx, пропуская группы вроде `(ru)`. */
function hasPageForUrl(url: string): boolean {
  const segments = url.split("/").filter(Boolean);

  function walk(dir: string, rest: string[]): boolean {
    if (rest.length === 0 && existsSync(path.join(dir, "page.tsx"))) return true;
    return readdirSync(dir, { withFileTypes: true }).some((entry) => {
      if (!entry.isDirectory()) return false;
      const next = path.join(dir, entry.name);
      if (entry.name.startsWith("(")) return walk(next, rest);
      return rest[0] === entry.name && walk(next, rest.slice(1));
    });
  }

  return walk(appDir, segments);
}

const calls = (): string[] => vi.mocked(revalidatePath).mock.calls.map(([p]) => p);

/** Сброшенные страницы работ — без готовых страниц категорий `/gallery/category/…`. */
const artworkCalls = (): string[] =>
  calls().filter((p) => p.includes("/gallery/") && !galleryCategoryPaths.includes(p));

describe("revalidateSharedPages", () => {
  it("общий список миниатюр — существующий адрес и сбрасывается с общими страницами", () => {
    expect(existsSync(path.join(appDir, artworkThumbsPath, "route.ts"))).toBe(true);
    vi.mocked(revalidatePath).mockClear();
    revalidateSharedPages();
    expect(calls()).toContain(artworkThumbsPath);
  });

  it("карта сайта — существующий файл и сбрасывается с общими страницами", () => {
    expect(existsSync(path.join(appDir, "sitemap.ts"))).toBe(true);
    expect(sitemapPath).toBe("/sitemap.xml");
    vi.mocked(revalidatePath).mockClear();
    revalidateSharedPages();
    expect(calls()).toContain(sitemapPath);
  });

  it("готовые страницы категорий — на обоих языках, у каждой есть файл, сбрасываются с общими (тикет О-11)", () => {
    expect(galleryCategoryPaths).toContain("/gallery/category/flowers");
    expect(galleryCategoryPaths).toContain("/en/gallery/category/flowers");
    for (const url of galleryCategoryPaths) {
      expect(hasPageForUrl(url.replace(/[^/]+$/, "[category]")), url).toBe(true);
    }

    vi.mocked(revalidatePath).mockClear();
    revalidateSharedPages();
    expect(calls()).toEqual(expect.arrayContaining([...galleryCategoryPaths]));
  });

  it("у каждого готового адреса есть страница", () => {
    for (const url of publicPaths) expect(hasPageForUrl(url), url).toBe(true);
  });

  it("страницы работ не трогает — ни шаблоном, ни по одной (тикет О-5)", () => {
    vi.mocked(revalidatePath).mockClear();
    revalidateSharedPages();
    expect(artworkCalls()).toEqual([]);
    expect(vi.mocked(revalidatePath).mock.calls.every((call) => call.length === 1)).toBe(true);
  });
});

/**
 * Мелкая правка сбрасывает страницы одной работы (с примерочной — четыре), а не четыреста: иначе каждое
 * сохранение в админке пересобирало весь сайт (записи в кеш Vercel,
 * 21.10.2026).
 */
describe("revalidateArtworkPage и revalidateAfterImageChange", () => {
  it("страница работы и её примерочная — на обоих языках и с адресом, у которого есть файл", () => {
    vi.mocked(revalidatePath).mockClear();
    revalidateArtworkPage("abc");
    expect(calls()).toEqual([
      "/gallery/abc",
      "/gallery/abc/room",
      "/en/gallery/abc",
      "/en/gallery/abc/room",
    ]);
    for (const url of calls()) expect(hasPageForUrl(url.replace("abc", "[id]")), url).toBe(true);
  });

  it("главное фото не менялось — только своя страница", () => {
    vi.mocked(revalidatePath).mockClear();
    revalidateAfterImageChange("abc", "img1", "img1");
    expect(calls()).toEqual([
      "/gallery/abc",
      "/gallery/abc/room",
      "/en/gallery/abc",
      "/en/gallery/abc/room",
    ]);
  });

  it("главное фото сменилось или появилось — своя страница и общие, но не чужие", () => {
    for (const [before, after] of [
      ["img1", "img2"],
      [null, "img1"],
      ["img1", null],
    ] as const) {
      vi.mocked(revalidatePath).mockClear();
      revalidateAfterImageChange("abc", before, after);
      expect(calls()).toEqual(
        expect.arrayContaining([...publicPaths, "/gallery/abc", "/en/gallery/abc"]),
      );
      expect(artworkCalls()).toEqual([
        "/gallery/abc",
        "/gallery/abc/room",
        "/en/gallery/abc",
        "/en/gallery/abc/room",
      ]);
    }
  });
});
