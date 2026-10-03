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
 *
 * `dense` — как grid-auto-flow: row dense на телефоне: поиск места каждый
 * раз начинается сверху, и плитка встаёт в первую подходящую дыру.
 */
function place(
  tiles: { className: string }[],
  columns: number,
  { prefix = "md:", dense = false }: { prefix?: "" | "md:"; dense?: boolean } = {},
) {
  const taken = new Set<string>();
  const startColumns: number[] = [];
  let row = 0;
  let col = 0;
  let lastRow = 0;

  for (const tile of tiles) {
    const width = span(tile.className, prefix, "col");
    const height = span(tile.className, prefix, "row");
    if (dense) {
      row = 0;
      col = 0;
    }

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

/** Работы без отметки «крупно». */
function plain(count: number): { isLarge: boolean }[] {
  return Array.from({ length: count }, () => ({ isLarge: false }));
}

/** Работы с номером и отметкой: по номеру видно, кто куда переехал. */
function marked(flags: boolean[]): { n: number; isLarge: boolean }[] {
  return flags.map((isLarge, n) => ({ n, isLarge }));
}

/** Все сочетания отметок для `count` работ. */
function everyCombination(count: number): boolean[][] {
  return Array.from({ length: 2 ** count }, (_, mask) =>
    Array.from({ length: count }, (_, bit) => Boolean(mask & (1 << bit))),
  );
}

describe("collageLayout", () => {
  it("отдаёт по одной плитке на работу", () => {
    expect(collageLayout(plain(7))).toHaveLength(7);
  });

  it("заполняет последнюю строку без дыр при любом числе работ", () => {
    for (let count = 1; count <= 20; count += 1) {
      const tiles = collageLayout(plain(count));

      const desktop = tiles.reduce((sum, tile) => sum + cells(tile.className, "md:"), 0);
      const mobile = tiles.reduce((sum, tile) => sum + cells(tile.className, ""), 0);

      expect(desktop % 4, `десктоп, работ: ${count}`).toBe(0);
      expect(mobile % 2, `телефон, работ: ${count}`).toBe(0);
    }
  });

  it("держит плитки близко к квадрату — ни одной полоски", () => {
    for (let count = 1; count <= 20; count += 1) {
      for (const tile of collageLayout(plain(count))) {
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
      expect(place(collageLayout(plain(count)), 4).holes, `работ: ${count}`).toBe(0);
    }
  });

  it("чередует крупную работу слева и справа в полных блоках", () => {
    const tiles = collageLayout(plain(15));
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
    const tiles = collageLayout(plain(6));

    // Без этого шестая работа получала полосу 4×2 во всю ширину коллажа.
    expect(tiles.every((tile) => !tile.className.includes("md:col-span-4"))).toBe(true);
    expect(tiles[0].className).toContain("md:row-span-2");
    expect(tiles[1].className).toContain("md:row-span-2");
    expect(tiles[2].className).toContain("md:col-span-1");
  });

  it("растягивает единственную работу на всю ширину", () => {
    const [only] = collageLayout(plain(1));

    expect(only.className).toContain("md:col-span-4");
    expect(only.sizes).toBe("(max-width: 767px) 100vw, 100vw");
  });

  it("считает sizes по доле столбцов, а не одним значением на всё", () => {
    const tiles = collageLayout(plain(5));

    // Крупная плитка — половина окна, мелкая — четверть.
    expect(tiles[0].sizes).toBe("(max-width: 767px) 50vw, 50vw");
    expect(tiles[2].sizes).toBe("(max-width: 767px) 50vw, 25vw");
  });

  it("не оставляет дыр ни при каком сочетании крупных работ", () => {
    // Все сочетания до 11 работ: два полных блока и остаток, ~4000 вариантов.
    for (let count = 1; count <= 11; count += 1) {
      for (const flags of everyCombination(count)) {
        const tiles = collageLayout(marked(flags));
        const label = `работ: ${count}, крупные: ${flags.map(Number).join("")}`;

        expect(place(tiles, 4).holes, `компьютер, ${label}`).toBe(0);
        expect(place(tiles, 2, { prefix: "", dense: true }).holes, `телефон, ${label}`).toBe(0);
        // Ни одна работа не потерялась и не задвоилась при перестановке.
        expect(tiles.map((tile) => tile.item.n).sort((a, b) => a - b)).toEqual(
          flags.map((_, n) => n),
        );
      }
    }
  });

  it("на телефоне крупная работа — квадрат во всю ширину", () => {
    const tiles = collageLayout(marked([false, false, true, false, false]));
    const large = tiles.find((tile) => tile.item.isLarge);

    expect(large?.className).toContain("col-span-2 row-span-2");
    expect(large?.sizes.startsWith("(max-width: 767px) 100vw")).toBe(true);
  });

  it("на компьютере ставит крупную работу в крупную ячейку", () => {
    // Десять работ: крупные ячейки — первая и восьмая (зеркальный блок).
    const tiles = collageLayout(
      marked([false, false, false, false, false, false, true, false, false, false]),
    );
    const index = tiles.findIndex((tile) => tile.item.isLarge);

    expect(index).toBe(7);
    expect(tiles[index].className).toContain("md:col-span-2 md:row-span-2");
  });

  it("сохраняет порядок остальных работ", () => {
    const tiles = collageLayout(
      marked([false, false, false, false, false, false, true, false, false, false]),
    );
    const others = tiles.filter((tile) => !tile.item.isLarge).map((tile) => tile.item.n);

    expect(others).toEqual([0, 1, 2, 3, 4, 5, 7, 8, 9]);
  });

  it("лишние крупные остаются мелкими на компьютере, но не теряются", () => {
    // Пять работ — одна крупная ячейка, а отмечены три.
    const tiles = collageLayout(marked([true, true, true, false, false]));
    const heroes = tiles.filter((tile) => tile.className.includes("md:row-span-2"));

    expect(heroes).toHaveLength(1);
    expect(heroes[0].item.n).toBe(0);
  });
});
