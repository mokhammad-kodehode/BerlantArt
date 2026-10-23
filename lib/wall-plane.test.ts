import { describe, expect, it } from "vitest";

import {
  applyAffine,
  applyHomography,
  frontalWall,
  homography,
  isConvexClockwise,
  isInsideQuad,
  localAffine,
  wallFromCorners,
  type Point,
  type Quad,
} from "@/lib/wall-plane";

/**
 * Масштаб стены по мерке ломается незаметно: перепутанный знак или
 * порядок углов — и картина 80 см висит на фото размером с дверь. По этой
 * картинке покупатель решает, впишется ли холст в его комнату.
 */

const close = (actual: Point, expected: Point, digits = 6) => {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
};

/** Лист А4 на фото, снятом чуть сбоку: правый край дальше и меньше. */
const a4: Quad = [
  { x: 400, y: 300 },
  { x: 610, y: 320 },
  { x: 605, y: 580 },
  { x: 402, y: 610 },
];
const a4Size = { width: 21, height: 29.7 };

describe("wallFromCorners", () => {
  it("углы мерки ложатся ровно на отмеченные точки", () => {
    const plane = wallFromCorners(a4, a4Size);
    expect(plane).not.toBeNull();
    if (plane === null) return;

    close(applyHomography(plane.toPhoto, { x: 0, y: 0 }), a4[0]);
    close(applyHomography(plane.toPhoto, { x: 21, y: 0 }), a4[1]);
    close(applyHomography(plane.toPhoto, { x: 21, y: 29.7 }), a4[2]);
    close(applyHomography(plane.toPhoto, { x: 0, y: 29.7 }), a4[3]);
  });

  it("обратный пересчёт возвращает ту же точку стены", () => {
    const plane = wallFromCorners(a4, a4Size);
    if (plane === null) throw new Error("мерка не построилась");

    for (const point of [
      { x: 10, y: 15 },
      { x: -80, y: 40 },
      { x: 150, y: -60 },
    ]) {
      close(applyHomography(plane.toWall, applyHomography(plane.toPhoto, point)), point, 4);
    }
  });

  it("три угла на одной прямой — мерки нет, а не картина в бесконечность", () => {
    const flat: Quad = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 10 },
    ];
    expect(wallFromCorners(flat, a4Size)).toBeNull();
  });
});

describe("localAffine", () => {
  it("на фото, снятом прямо, — ровный масштаб без наклона", () => {
    // Дверь 80 × 200 см шириной 160 точек: 2 точки на сантиметр.
    const door: Quad = [
      { x: 100, y: 50 },
      { x: 260, y: 50 },
      { x: 260, y: 450 },
      { x: 100, y: 450 },
    ];
    const plane = wallFromCorners(door, { width: 80, height: 200 });
    if (plane === null) throw new Error("мерка не построилась");

    const t = localAffine(plane, { x: 40, y: 100 });
    expect(t.a).toBeCloseTo(2);
    expect(t.d).toBeCloseTo(2);
    expect(t.b).toBeCloseTo(0);
    expect(t.c).toBeCloseTo(0);
    close({ x: t.e, y: t.f }, { x: 180, y: 250 });
  });

  it("рядом с точкой совпадает с перспективой — картина ложится по наклону стены", () => {
    const plane = wallFromCorners(a4, a4Size);
    if (plane === null) throw new Error("мерка не построилась");

    const at = { x: 10, y: 15 };
    const t = localAffine(plane, at);
    // Сдвиг на 1 см — это около 10 точек на этом фото. Приближение и точный
    // пересчёт расходятся меньше чем на 0.15 точки — полтора процента.
    for (const step of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]) {
      const exact = applyHomography(plane.toPhoto, { x: at.x + step.x, y: at.y + step.y });
      const near = applyAffine(t, step);
      expect(Math.hypot(near.x - exact.x, near.y - exact.y)).toBeLessThan(0.15);
    }
  });
});

describe("frontalWall", () => {
  it("«на глаз»: сантиметр — ровно pxPerCm точек, туда и обратно", () => {
    const plane = frontalWall(3);
    close(applyHomography(plane.toPhoto, { x: 10, y: 20 }), { x: 30, y: 60 });
    close(applyHomography(plane.toWall, { x: 30, y: 60 }), { x: 10, y: 20 });
  });

  it("ноль сантиметров — в середине фото: масштаб растит картины от неё", () => {
    const plane = frontalWall(2, { x: 500, y: 400 });
    close(applyHomography(plane.toPhoto, { x: 0, y: 0 }), { x: 500, y: 400 });
    close(applyHomography(plane.toPhoto, { x: 10, y: -5 }), { x: 520, y: 390 });
    close(applyHomography(plane.toWall, { x: 520, y: 390 }), { x: 10, y: -5 });
  });
});

describe("проверка мерки", () => {
  it("углы по часовой стрелке — годится, «бантиком» — нет", () => {
    expect(isConvexClockwise(a4)).toBe(true);
    const bow: Quad = [a4[0], a4[2], a4[1], a4[3]];
    expect(isConvexClockwise(bow)).toBe(false);
    expect(isConvexClockwise([a4[0], a4[3], a4[2], a4[1]])).toBe(false);
  });

  it("попадание пальцем в картину", () => {
    expect(isInsideQuad(a4, { x: 500, y: 450 })).toBe(true);
    expect(isInsideQuad(a4, { x: 700, y: 450 })).toBe(false);
  });

  it("гомография переводит четырёхугольник сам в себя без искажений", () => {
    const m = homography(a4, a4);
    if (m === null) throw new Error("нет матрицы");
    close(applyHomography(m, { x: 500, y: 450 }), { x: 500, y: 450 });
  });
});
