import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { frameLooks, frameStyle, railLight } from "@/lib/frame-look";
import { roomFrames } from "@/lib/room-options";

/**
 * Рама рисуется в двух местах — CSS на экране и canvas на снимке стены —
 * по одним данным. Разойтись они могут только в том, что CSS держит сам:
 * свет по сторонам. Его и сверяем; остальное CSS получает переменными.
 */
describe("свет на планках", () => {
  it("тот же, что filter: brightness() у планок в globals.css", () => {
    const css = readFileSync(path.join(import.meta.dirname, "../app/globals.css"), "utf8");
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const block = new RegExp(`\\.framed-rail-${side}\\s*\\{([^}]*)\\}`).exec(css);
      const value = block && /filter:\s*brightness\(([\d.]+)\)/.exec(block[1]);
      expect(Number(value?.[1]), side).toBe(railLight[side]);
    }
  });
});

describe("frameStyle", () => {
  it("профиль каждой рамы идёт от наружного края (0) к холсту (1)", () => {
    for (const [frame, look] of Object.entries(frameLooks)) {
      const stops = look.profile.map(([, at]) => at);
      expect(stops[0], frame).toBe(0);
      expect(stops.at(-1), frame).toBe(1);
      expect(stops, frame).toEqual([...stops].sort((a, b) => a - b));
    }
  });

  it("проценты без хвостов плавающей точки — 7%, а не 7.000000000000001%", () => {
    const style = frameStyle({ frame: "classic", finish: "gold" });
    expect(style["--profile"]).toContain("#a7803a 42%");
    expect(String(style["--profile"])).not.toMatch(/\d\.\d{4,}%/);
    expect(style["--band1-size"]).toBe("16%");
  });

  it("волокно — только у дерева", () => {
    expect(frameStyle({ frame: "modern", finish: "oak" })["--grain"]).toContain(
      "rgb(0 0 0 / 0.14)",
    );
    expect(frameStyle({ frame: "modern", finish: "black" })["--grain"]).toBe("transparent 0 1px");
  });

  it("у «без рамы» ширина ноль и ни профиля, ни узора", () => {
    const style = frameStyle({ frame: "none", finish: "gold" });
    expect(style["--t-cm"]).toBe(0);
    expect(style["--profile"]).toBeUndefined();
  });

  it("у каждой модели, кроме «без рамы», есть вид", () => {
    for (const { id } of roomFrames) {
      if (id === "none") continue;
      expect(frameLooks[id], id).toBeDefined();
    }
  });
});
