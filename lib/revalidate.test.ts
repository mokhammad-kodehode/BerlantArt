import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";

import {
  artworkPagePatterns,
  publicPaths,
  revalidateAfterImageChange,
  revalidateArtworkPage,
  revalidatePublicPages,
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

describe("revalidatePublicPages", () => {
  it("шаблоны страниц работ совпадают с файлами в app/, вместе с группами", () => {
    // Именно это сломалось при переезде в (ru)/(en): шаблон без группы
    // молча ничего не сбрасывал.
    for (const pattern of artworkPagePatterns) {
      expect(existsSync(path.join(appDir, pattern, "page.tsx")), pattern).toBe(true);
    }
  });

  it("у каждого готового адреса есть страница", () => {
    for (const url of publicPaths) expect(hasPageForUrl(url), url).toBe(true);
  });

  it("сбрасывает и адреса, и страницы работ на обоих языках", async () => {
    const { revalidatePath } = await import("next/cache");
    revalidatePublicPages();
    expect(revalidatePath).toHaveBeenCalledWith("/(ru)/gallery/[id]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/(en)/en/gallery/[id]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/en/gallery");
  });
});

/**
 * Мелкая правка сбрасывает две страницы, а не четыреста: иначе каждое
 * сохранение в админке пересобирало весь сайт (записи в кеш Vercel,
 * 21.10.2026).
 */
describe("revalidateArtworkPage и revalidateAfterImageChange", () => {
  const calls = (): string[] => vi.mocked(revalidatePath).mock.calls.map(([p]) => p);

  it("страница работы — на обоих языках и с адресом, у которого есть файл", () => {
    vi.mocked(revalidatePath).mockClear();
    revalidateArtworkPage("abc");
    expect(calls()).toEqual(["/gallery/abc", "/en/gallery/abc"]);
    for (const url of calls()) expect(hasPageForUrl(url.replace("abc", "[id]")), url).toBe(true);
  });

  it("главное фото не менялось — только своя страница", () => {
    vi.mocked(revalidatePath).mockClear();
    revalidateAfterImageChange("abc", "img1", "img1");
    expect(calls()).toEqual(["/gallery/abc", "/en/gallery/abc"]);
  });

  it("главное фото сменилось или появилось — весь сайт", () => {
    for (const [before, after] of [
      ["img1", "img2"],
      [null, "img1"],
      ["img1", null],
    ] as const) {
      vi.mocked(revalidatePath).mockClear();
      revalidateAfterImageChange("abc", before, after);
      expect(calls()).toEqual(expect.arrayContaining([...publicPaths]));
    }
  });
});
