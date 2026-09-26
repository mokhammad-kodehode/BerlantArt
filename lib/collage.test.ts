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

/**
 * Расставляет плитки так же, как браузер в сетке без явных позиций
 * (grid-auto-flow: row, без dense): курсор идёт слева направо и вниз
 * и никогда не возвращается назад. Возвращает, в каком столбце начинается
 * каждая плитка, и число пустых клеток.
 *
 * Подсчёта клеток мало: сумма может делиться на 4, а крупная плитка при
 * неудачном порядке всё равно уедет на следующую строку и оставит дыру.
 */
function place(tiles: { className: string }[], columns: number) {
  const taken = new Set<string>();
  const startColumns: number[] = [];
  let row = 0;
  let col = 0;
  let lastRow = 0;

  for (const tile of tiles) {
    const width = span(tile.className, "md:", "col");
    const height = span(tile.className, "md:", "row");

    const fits = (r: number, c: number) => {
      if (c + width > columns) return false;
      for (let dr = 0; dr < height; dr += 1)
        for (let dc = 0; dc < width; dc += 1) if (taken.has(`${r + dr}:${c + dc}`)) return false;
      return true;
    };

    while (!fits(row, col)) {
      col += 1;
      if (col >= columns) {
        col = 0;
        row += 1;
      }
    }

    for (let dr = 0; dr < height; dr += 1)
      for (let dc = 0; dc < width; dc += 1) taken.add(`${row + dr}:${col + dc}`);

    startColumns.push(col);
    lastRow = Math.max(lastRow, row + height);
    col += width;
  }

  return { startColumns, holes: lastRow * columns - taken.size };
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

  it("не оставляет дыр при настоящей расстановке по сетке", () => {
    for (let count = 1; count <= 40; count += 1) {
      expect(place(collageLayout(count), 4).holes, `работ: ${count}`).toBe(0);
    }
  });

  it("чередует крупную работу слева и справа в полных блоках", () => {
    const tiles = collageLayout(15);
    const { startColumns } = place(tiles, 4);

    // Блок 1: крупная первой, слева. Блок 2: третьей, справа. Блок 3: снова слева.
    expect(tiles[0].className).toContain("md:row-span-2");
    expect(startColumns[0]).toBe(0);
    expect(tiles[7].className).toContain("md:row-span-2");
    expect(startColumns[7]).toBe(2);
    expect(tiles[10].className).toContain("md:row-span-2");
    expect(startColumns[10]).toBe(0);
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
