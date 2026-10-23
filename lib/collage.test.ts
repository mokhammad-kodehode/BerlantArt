import { describe, expect, it } from "vitest";

import { hangLayout, revealCountFor, revealStep } from "@/lib/collage";

describe("revealCountFor", () => {
  it("плитка в первой порции — одна порция", () => {
    expect(revealCountFor(0, 203)).toBe(revealStep);
    expect(revealCountFor(revealStep - 1, 203)).toBe(revealStep);
  });

  it("плитка дальше — порции до неё целиком", () => {
    expect(revealCountFor(revealStep, 203)).toBe(2 * revealStep);
    expect(revealCountFor(150, 203)).toBe(160);
  });

  it("не больше, чем работ всего", () => {
    expect(revealCountFor(202, 203)).toBe(203);
    expect(revealCountFor(3, 6)).toBe(6);
  });
});

describe("hangLayout — развеска", () => {
  const items = [
    { id: "a", isLarge: false },
    { id: "b", isLarge: true },
    { id: "c", isLarge: false },
  ];

  it("порядок как пришёл: ячеек нет, переставлять крупные некуда", () => {
    expect(hangLayout(items).map((tile) => tile.item.id)).toEqual(["a", "b", "c"]);
  });

  it("крупная работа из админки помечена — CSS делает её самой большой", () => {
    expect(hangLayout(items).map((tile) => tile.className)).toEqual(["", "wall-hang-large", ""]);
  });

  it("sizes есть у каждой плитки — иначе браузер качает самый крупный файл", () => {
    for (const tile of hangLayout(items)) expect(tile.sizes).toMatch(/vw/);
  });
});
