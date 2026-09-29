import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { readImageSize } from "@/lib/image-size";

/** Картинка 30 × 20 с заданным EXIF-поворотом. */
async function picture(orientation?: number): Promise<Uint8Array> {
  const image = sharp({
    create: { width: 30, height: 20, channels: 3, background: "#806040" },
  }).jpeg();

  return orientation === undefined
    ? image.toBuffer()
    : image.withMetadata({ orientation }).toBuffer();
}

describe("readImageSize", () => {
  it("читает ширину и высоту", async () => {
    expect(await readImageSize(await picture())).toEqual({ width: 30, height: 20 });
  });

  it("меняет стороны у снимка, повёрнутого набок", async () => {
    // Поворот 6 — телефон держали вертикально: в файле 30 × 20, на экране 20 × 30.
    // Без этого стоячая картина считалась бы лежачей.
    expect(await readImageSize(await picture(6))).toEqual({ width: 20, height: 30 });
  });

  it("не трогает стороны при повороте на 180°", async () => {
    expect(await readImageSize(await picture(3))).toEqual({ width: 30, height: 20 });
  });

  it("отказывает, если это не картинка", async () => {
    await expect(readImageSize(new TextEncoder().encode("не картинка"))).rejects.toThrow();
  });
});
