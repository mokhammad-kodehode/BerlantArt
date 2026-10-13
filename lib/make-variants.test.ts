import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { variantKey, variantWidths } from "@/lib/image-variants";
import { makeVariants } from "@/lib/make-variants";

/**
 * Нарезка ходит в бакет, поэтому сеть здесь подменена: вместо R2 —
 * словарь в памяти. Проверяется то, что можно сломать незаметно: какие
 * ключи получают копии, что копии не шире заказанного и что при сбое
 * за собой убирается всё.
 */
const key = "artworks/v2/0b5c2d1e-1f2a-4b3c-8d4e-5f6a7b8c9d0e-dom.webp";
const bucket = new Map<string, Uint8Array>();

beforeEach(() => {
  bucket.clear();
  vi.stubEnv("R2_ACCOUNT_ID", "acc");
  vi.stubEnv("R2_ACCESS_KEY_ID", "key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
  vi.stubEnv("R2_BUCKET_NAME", "bucket");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function fakeR2({ failOn }: { failOn?: string } = {}) {
  vi.stubGlobal("fetch", async (input: Request | string, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const objectKey = new URL(request.url).pathname.split("/").slice(2).join("/");
    if (request.method === "PUT") {
      // 403, а не 500: на 5xx aws4fetch повторяет запрос с паузами, и тест
      // ждал бы минуту.
      if (failOn && objectKey.endsWith(failOn)) return new Response(null, { status: 403 });
      bucket.set(objectKey, new Uint8Array(await request.arrayBuffer()));
      return new Response(null, { status: 200 });
    }
    if (request.method === "DELETE") {
      bucket.delete(objectKey);
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  });
}

const photo = async (width: number) =>
  new Uint8Array(
    await sharp({
      create: { width, height: Math.round(width * 0.75), channels: 3, background: "#7a5632" },
    })
      .webp()
      .toBuffer(),
  );

describe("makeVariants", () => {
  it("кладёт четыре копии рядом с исходником, каждая не шире своей ширины", async () => {
    fakeR2();
    await makeVariants(key, await photo(2500));

    for (const width of variantWidths) {
      const copy = bucket.get(variantKey(key, width));
      expect(copy, `копия ${width}`).toBeDefined();
      const meta = await sharp(copy).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(width);
    }
  });

  it("мелкий снимок не растягивает", async () => {
    fakeR2();
    await makeVariants(key, await photo(600));

    expect((await sharp(bucket.get(variantKey(key, 1600))).metadata()).width).toBe(600);
  });

  it("сбой одной копии — убирает все и сообщает об ошибке", async () => {
    fakeR2({ failOn: ".w1200.webp" });

    await expect(makeVariants(key, await photo(2500))).rejects.toThrow();
    expect([...bucket.keys()]).toEqual([]);
  });
});
