import { describe, expect, it } from "vitest";

import { encodeWithinLimit, fitWithin, qualitySteps, type Size } from "@/lib/prepare-image";
import { maxLongSide } from "@/lib/upload-limits";

/**
 * Подбор размера и качества перед заливкой. Ошибку здесь глазами
 * не заметить: фото загрузится, просто окажется мылом, лишне тяжёлым
 * или повёрнутым к лимиту не той стороной.
 */

describe("fitWithin", () => {
  it("вписывает длинную сторону в предел и сохраняет пропорции", () => {
    expect(fitWithin({ width: 3000, height: 4000 }, 2500)).toEqual({ width: 1875, height: 2500 });
    expect(fitWithin({ width: 5000, height: 2500 }, 2500)).toEqual({ width: 2500, height: 1250 });
  });

  it("не растягивает маленький снимок", () => {
    // Из 600px 2500 не сделать — будет только мыло и лишний вес.
    expect(fitWithin({ width: 600, height: 450 }, 2500)).toEqual({ width: 600, height: 450 });
  });
});

/** Поддельное сжатие: вес пропорционален площади и качеству. */
function fakeEncoder(bytesPerPixelAtFull: number) {
  const calls: { size: Size; quality: number }[] = [];
  const encode = async (size: Size, quality: number) => {
    calls.push({ size, quality });
    return new Blob([
      new Uint8Array(Math.round(size.width * size.height * bytesPerPixelAtFull * quality)),
    ]);
  };
  return { calls, encode };
}

describe("encodeWithinLimit", () => {
  it("берёт лучшее качество, если оно влезает, и не пробует хуже", async () => {
    const { calls, encode } = fakeEncoder(0.1);
    await encodeWithinLimit({ width: 3000, height: 4000 }, encode, 1_000_000);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.quality).toBe(qualitySteps[0]);
    expect(Math.max(calls[0]!.size.width, calls[0]!.size.height)).toBe(maxLongSide);
  });

  it("снижает качество ступенями, прежде чем уменьшать картинку", async () => {
    // 1875×2500 при 0.85 — 1.19 МБ, при 0.8 — 1.12, при 0.75 — 1.05: не влезает
    // ни одна ступень, картинка уменьшается, и на 0.85 от прежнего размера
    // первая же ступень проходит.
    const { calls, encode } = fakeEncoder(0.3);
    const blob = await encodeWithinLimit({ width: 3000, height: 4000 }, encode, 1_000_000);

    expect(calls.map((c) => c.quality)).toEqual([...qualitySteps, qualitySteps[0]]);
    expect(calls[3]?.size.height).toBeLessThan(maxLongSide);
    expect(blob.size).toBeLessThanOrEqual(1_000_000);
  });

  it("сдаётся с понятным текстом, а не крутится вечно", async () => {
    const { encode } = fakeEncoder(0.001);
    await expect(encodeWithinLimit({ width: 3000, height: 4000 }, encode, 1)).rejects.toThrow(
      "не удалось ужать",
    );
  });
});
