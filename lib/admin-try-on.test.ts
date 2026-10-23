import { describe, expect, it } from "vitest";

import { tryOnNotice } from "@/lib/admin-try-on";

describe("tryOnNotice", () => {
  it("квадратное фото прямоугольного холста — оба размера и пример в обе стороны", () => {
    const { short, text } = tryOnNotice({
      kind: "shape",
      dimensions: "90 × 120 см",
      sides: { short: 90, long: 120 },
      photo: { width: 1080, height: 1080 },
    });
    expect(short).toBe("фото не по форме холста");
    expect(text).toContain("Фото 1080 × 1080 пикс. — квадратное, а холст — 90 × 120 см.");
    expect(text).toContain(
      "примерно 810 × 1080 пикс. (или 1080 × 810, если картина горизонтальная).",
    );
  });

  it("у горизонтального фото пример — горизонтальный", () => {
    const { text } = tryOnNotice({
      kind: "shape",
      dimensions: "60/60",
      sides: { short: 60, long: 60 },
      photo: { width: 1200, height: 800 },
    });
    expect(text).toContain("— горизонтальное, а холст — 60 × 60 см.");
    expect(text).toContain("примерно 1200 × 1200 пикс. Или");
  });

  it("у вертикального — вертикальный", () => {
    const { text } = tryOnNotice({
      kind: "shape",
      dimensions: "50 × 100 см",
      sides: { short: 50, long: 100 },
      photo: { width: 1080, height: 1350 },
    });
    expect(text).toContain("— вертикальное");
    expect(text).toContain("примерно 675 × 1350 пикс.");
  });

  it("непрочитанный размер показывает так, как его вписали", () => {
    expect(tryOnNotice({ kind: "badSize", dimensions: "около метра" }).text).toContain(
      "«около метра»",
    );
  });
});
