import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildPaintingScene,
  canvasDepthM,
  canvasPlacement,
  frameProfile,
  linearColor,
  type ArPart,
} from "@/lib/ar-model";
import {
  frameFinish,
  frameModel,
  framedSides,
  roomFrames,
  type RoomFinish,
} from "@/lib/room-options";

const sides = { short: 40, long: 50 };

describe("canvasPlacement", () => {
  it("ставит холст стоя, если фото стоячее", () => {
    expect(canvasPlacement(sides, { width: 800, height: 1000 })).toEqual({
      widthM: 0.4,
      heightM: 0.5,
    });
  });

  it("кладёт холст, если фото лежачее", () => {
    expect(canvasPlacement(sides, { width: 1000, height: 800 })).toEqual({
      widthM: 0.5,
      heightM: 0.4,
    });
  });

  it("терпит неровное кадрирование в пределах 8%", () => {
    // 0.8 против 0.75 — расхождение 6.7%.
    expect(canvasPlacement(sides, { width: 750, height: 1000 })).not.toBeNull();
  });

  it("отказывает, если фото и холст разной формы", () => {
    // Квадратное фото у холста 40 × 50 — не та фотография или не тот размер.
    expect(canvasPlacement(sides, { width: 1000, height: 1000 })).toBeNull();
    expect(canvasPlacement(sides, { width: 0, height: 0 })).toBeNull();
  });
});

describe("linearColor", () => {
  it("переводит sRGB в линейный", () => {
    expect(linearColor("#000000")).toEqual([0, 0, 0]);
    expect(linearColor("#ffffff")).toEqual([1, 1, 1]);
    // Середина шкалы в CSS — это всего пятая часть света.
    expect(linearColor("#808080")[0]).toBeCloseTo(0.216, 3);
  });

  it("не принимает цвет в другой записи", () => {
    expect(() => linearColor("gold")).toThrow();
  });
});

describe("тон покрытия", () => {
  it("совпадает с --f-mid в globals.css", () => {
    const css = readFileSync(path.join(import.meta.dirname, "../app/globals.css"), "utf8");
    const finishes = new Set(roomFrames.flatMap((frame) => frame.finishes));

    for (const finish of finishes) {
      const block = new RegExp(`\\[data-finish="${finish}"\\]\\s*\\{([^}]*)\\}`).exec(css);
      const mid = block && /--f-mid:\s*(#[0-9a-f]{6})/i.exec(block[1]);
      expect(mid?.[1].toLowerCase(), finish).toBe(frameFinish(finish).tone);
    }
  });
});

describe("сечения рам", () => {
  it("совпадают по ширине и выступу с моделями примерочной", () => {
    for (const { id, widthCm, depthCm } of roomFrames) {
      if (id === "none") continue;
      const profile = frameProfile(id);
      expect(Math.max(...profile.map(([inset]) => inset)), id).toBe(widthCm);
      expect(Math.max(...profile.map(([, height]) => height)), id).toBe(depthCm);
    }
  });

  it("выступают над холстом у самого проёма", () => {
    // Иначе холст торчал бы из рамы вперёд.
    for (const { id } of roomFrames) {
      if (id === "none") continue;
      const inner = frameProfile(id).filter(([inset]) => inset === frameModel(id).widthCm);
      expect(Math.max(...inner.map(([, height]) => height)) / 100, id).toBeGreaterThan(
        canvasDepthM,
      );
    }
  });
});

/** Каждый треугольник обходится против часовой стрелки со стороны своей нормали. */
function windingMatchesNormals(part: ArPart): boolean {
  const p = (i: number) => part.positions.slice(i * 3, i * 3 + 3);
  for (let t = 0; t < part.indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => p(part.indices[t + k]));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const stored = part.normals.slice(part.indices[t] * 3, part.indices[t] * 3 + 3);
    if (n[0] * stored[0] + n[1] * stored[1] + n[2] * stored[2] <= 0) return false;
  }
  return true;
}

describe("buildPaintingScene", () => {
  const canvas = { widthM: 0.4, heightM: 0.5 };

  it("без рамы — ровно холст, задником к стене", () => {
    const scene = buildPaintingScene({ canvas, frame: "none", finish: "gold" });
    expect(scene.min).toEqual([-0.2, -0.25, 0]);
    expect(scene.max).toEqual([0.2, 0.25, canvasDepthM]);
  });

  it("в раме — тот же внешний размер, что пишет примерочная", () => {
    for (const { id, finishes, depthCm } of roomFrames) {
      if (id === "none") continue;
      const scene = buildPaintingScene({ canvas, frame: id, finish: finishes[0] });
      const framed = framedSides(sides, id);

      // Примерочная округляет до сантиметра, модель точная — отличие до 5 мм.
      expect(scene.max[0] - scene.min[0], id).toBeCloseTo(framed.short / 100, 2);
      expect(scene.max[1] - scene.min[1], id).toBeCloseTo(framed.long / 100, 2);
      expect(scene.max[2], id).toBeCloseTo(depthCm / 100, 6);
      expect(scene.min[2], id).toBe(0);
    }
  });

  it("все грани смотрят наружу", () => {
    for (const { id, finishes } of roomFrames) {
      const scene = buildPaintingScene({ canvas, frame: id, finish: finishes[0] ?? "gold" });
      for (const part of scene.parts)
        expect(windingMatchesNormals(part), `${id} ${part.name}`).toBe(true);
    }
  });

  it("фото — на лице холста, верх фото — вверху", () => {
    const scene = buildPaintingScene({ canvas, frame: "classic", finish: "gold" });
    const photo = scene.parts.find((part) => part.material.hasPhoto);
    expect(photo?.normals.slice(0, 3)).toEqual([0, 0, 1]);

    // Вершина с верхним краем фото (v = 0) — у верхнего края холста.
    const uvs = photo?.uvs ?? [];
    const top = uvs.findIndex((value, i) => i % 2 === 1 && value === 0);
    expect(photo?.positions[((top - 1) / 2) * 3 + 1]).toBe(0.25);
  });

  it("красит раму в тон покрытия, металл блестит", () => {
    const finishes: RoomFinish[] = ["gold", "walnut"];
    const [gold, walnut] = finishes.map((finish) =>
      buildPaintingScene({ canvas, frame: "classic", finish }).parts.find(
        (part) => part.name === "Frame",
      ),
    );
    expect(gold?.material.color).toEqual(linearColor("#a7803a"));
    expect(gold?.material.metallic).toBe(1);
    expect(walnut?.material.metallic).toBe(0);
  });

  it("у парящей рамы в зазоре тёмная подложка", () => {
    const scene = buildPaintingScene({ canvas, frame: "floater", finish: "black" });
    expect(scene.parts.map((part) => part.name)).toContain("Backing");
  });
});
