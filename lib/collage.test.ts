import { describe, expect, it } from "vitest";

import { collageLayout } from "@/lib/collage";

/**
 * Проверяем два свойства раскладки, которые ломаются незаметно:
 *
 * 1. В стене не остаётся дыр ни при каком числе работ. Дыра выглядит как
 *    поломка вёрстки, а всплывает только на том количестве картин, с которым
 *    не проверяли: художница добавит шестую работу через админку, и стена
 *    развалится уже на живом сайте.
 * 2. Ни одна плитка не вытягивается в полоску. Ориентацию холста мы заранее
 *    не знаем, и в ячейке 4:1 от вертикальной работы остаётся узкий поясок.
 *
 * Клетки считаются по именам классов — по тому, что реально уйдёт в разметку.
 * Подсчёт по внутренним данным сошёлся бы и при неверном словаре классов,
 * то есть проверял бы не то, что видит посетитель.
 */
function span(className: string, prefix: "" | "md:", axis: "col" | "row"): number {
  // Для телефона берём класс без префикса: "md:col-span-4" не начинается
  // с "col-span-", но содержит его, и поиск подстроки посчитал бы
  // десктопный размах за мобильный.
  const token = className.split(" ").find((cls) => cls.startsWith(`${prefix}${axis}-span-`));

  return Number(token?.slice(-1));
}

function cells(className: string, prefix: "" | "md:"): number {
  return span(className, prefix, "col") * span(className, prefix, "row");
}

describe("collageLayout", () => {
  it("отдаёт по одной плитке на работу", () => {
    expect(collageLayout(7)).toHaveLength(7);
  });

  it("заполняет последнюю строку без дыр при любом числе работ", () => {
    for (let count = 1; count <= 20; count += 1) {
      const tiles = collageLayout(count);

      const desktop = tiles.reduce((sum, tile) => sum + cells(tile.className, "md:"), 0);
      const mobile = tiles.reduce((sum, tile) => sum + cells(tile.className, ""), 0);

      expect(desktop % 4, `десктоп, работ: ${count}`).toBe(0);
      expect(mobile % 2, `телефон, работ: ${count}`).toBe(0);
    }
  });

  it("держит плитки близко к квадрату — ни одной полоски", () => {
    for (let count = 1; count <= 20; count += 1) {
      for (const tile of collageLayout(count)) {
        for (const prefix of ["", "md:"] as const) {
          const cols = span(tile.className, prefix, "col");
          const rows = span(tile.className, prefix, "row");

          // Ячейка сетки сама почти квадратная, поэтому отношение размахов —
          // это и есть пропорции плитки. Допускаем не более чем два к одному.
          expect(cols / rows, `${prefix || "телефон"}, работ: ${count}`).toBeLessThanOrEqual(2);
          expect(rows / cols, `${prefix || "телефон"}, работ: ${count}`).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("ставит крупную плитку первой в каждом полном блоке", () => {
    const tiles = collageLayout(10);

    expect(tiles[0].className).toContain("md:row-span-2");
    expect(tiles[5].className).toContain("md:row-span-2");
    expect(tiles[1].className).toContain("md:row-span-1");
  });

  it("раскладывает шесть работ двумя крупными и четырьмя мелкими", () => {
    const tiles = collageLayout(6);

    // Без этого шестая работа получала полосу 4×2 во всю ширину коллажа.
    expect(tiles.every((tile) => !tile.className.includes("md:col-span-4"))).toBe(true);
    expect(tiles[0].className).toContain("md:row-span-2");
    expect(tiles[1].className).toContain("md:row-span-2");
    expect(tiles[2].className).toContain("md:col-span-1");
  });

  it("растягивает единственную работу на всю ширину", () => {
    const [only] = collageLayout(1);

    expect(only.className).toContain("md:col-span-4");
    expect(only.sizes).toBe("(max-width: 767px) 100vw, 100vw");
  });

  it("считает sizes по доле столбцов, а не одним значением на всё", () => {
    const tiles = collageLayout(5);

    // Крупная плитка — половина окна, мелкая — четверть.
    expect(tiles[0].sizes).toBe("(max-width: 767px) 50vw, 50vw");
    expect(tiles[2].sizes).toBe("(max-width: 767px) 50vw, 25vw");
  });
});
