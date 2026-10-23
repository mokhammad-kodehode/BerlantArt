import { describe, expect, it } from "vitest";

import { arTarget, tryOnIssue } from "@/lib/ar-target";
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

  it("показывает работу при любом статусе", () => {
    // Продажа на сайте выключена, статус посетителю не виден — и по
    // кнопке камеры не должно быть видно, что картина продана.
    expect(arTarget(work({ status: "SOLD" }))).not.toBeNull();
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

describe("tryOnIssue", () => {
  // Все случаи из arTarget выше: и годные, и нет.
  const cases = [
    work(),
    work({ dimensions: null }),
    work({ dimensions: "  " }),
    work({ dimensions: "около метра" }),
    work({ images: [] }),
    work({}, { width: null, height: null }),
    work({}, { width: 1000, height: 1000 }),
    work({ dimensions: "50/40" }, { width: 1000, height: 800 }),
  ];

  it("причина есть ровно тогда, когда примерки нет — подсказка не врёт", () => {
    for (const each of cases) {
      expect(tryOnIssue(each) === null, each.dimensions ?? "без размера").toBe(
        arTarget(each) !== null,
      );
    }
  });

  it("называет причину", () => {
    expect(tryOnIssue(work({ dimensions: null }))).toEqual({ kind: "noSize" });
    expect(tryOnIssue(work({ dimensions: "около метра" }))).toEqual({
      kind: "badSize",
      dimensions: "около метра",
    });
    expect(tryOnIssue(work({ images: [] }))).toEqual({ kind: "noPhoto" });
    expect(tryOnIssue(work({}, { width: null, height: null }))).toEqual({ kind: "noPhotoSize" });
    expect(tryOnIssue(work({}, { width: 1000, height: 1000 }))).toEqual({
      kind: "shape",
      dimensions: "40 × 50 см",
      sides: { short: 40, long: 50 },
      photo: { width: 1000, height: 1000 },
    });
  });
});
