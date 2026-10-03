import { describe, expect, it } from "vitest";

import { arTarget } from "@/lib/ar";
import type { ArtworkWithImages } from "@/lib/artworks";

const created = new Date("2026-09-01");

/** Работа 40 × 50 со стоячим фото — то, что камера показать может. */
function work(
  changes: Partial<ArtworkWithImages> = {},
  photo: Partial<ArtworkWithImages["images"][number]> = {},
): ArtworkWithImages {
  return {
    id: "w1",
    title: "Башни в тумане",
    description: null,
    category: null,
    technique: "Холст, масло",
    dimensions: "40 × 50 см",
    year: null,
    price: null,
    status: "AVAILABLE",
    featured: false,
    isLarge: false,
    createdAt: created,
    updatedAt: created,
    images: [
      {
        id: "i1",
        artworkId: "w1",
        url: "artworks/bashni.webp",
        alt: "",
        isPrimary: true,
        order: 0,
        width: 800,
        height: 1000,
        createdAt: created,
        ...photo,
      },
    ],
    ...changes,
  };
}

describe("arTarget", () => {
  it("даёт холст в метрах, стоя — по фото", () => {
    expect(arTarget(work())?.canvas).toEqual({ widthM: 0.4, heightM: 0.5 });
  });

  it("не показывает проданную работу", () => {
    expect(arTarget(work({ status: "SOLD" }))).toBeNull();
    // Бронь — ещё не продажа: примерить её можно.
    expect(arTarget(work({ status: "RESERVED" }))).not.toBeNull();
  });

  it("не показывает без уверенного размера холста", () => {
    expect(arTarget(work({ dimensions: null }))).toBeNull();
    expect(arTarget(work({ dimensions: "около метра" }))).toBeNull();
  });

  it("не показывает без фото или его размера", () => {
    expect(arTarget(work({ images: [] }))).toBeNull();
    expect(arTarget(work({}, { width: null, height: null }))).toBeNull();
  });

  it("не показывает, если форма фото расходится с холстом", () => {
    expect(arTarget(work({}, { width: 1000, height: 1000 }))).toBeNull();
  });

  it("меняет версию вместе с фото и размером", () => {
    const base = arTarget(work())?.version;
    expect(base).toMatch(/^[0-9a-f]{12}$/);
    expect(arTarget(work())?.version).toBe(base);
    expect(arTarget(work({}, { url: "artworks/other.webp" }))?.version).not.toBe(base);
    expect(arTarget(work({ dimensions: "41 × 51 см" }))?.version).not.toBe(base);
  });
});
