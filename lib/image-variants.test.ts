import { describe, expect, it } from "vitest";

import imageLoader from "@/lib/image-loader";
import * as script from "@/scripts/make-image-variants.mjs";
import {
  hasVariants,
  imageSrcForWidth,
  pickVariantWidth,
  variantKey,
  variantKeys,
  variantPrefix,
  variantWidths,
} from "@/lib/image-variants";

const key = "artworks/v2/0b5c2d1e-1f2a-4b3c-8d4e-5f6a7b8c9d0e-dom.webp";
const url = `https://pub-test.r2.dev/${key}`;

describe("pickVariantWidth", () => {
  it("берёт самую узкую копию, что не уже нужной", () => {
    expect(pickVariantWidth(64)).toBe(400);
    expect(pickVariantWidth(400)).toBe(400);
    expect(pickVariantWidth(401)).toBe(800);
    expect(pickVariantWidth(1600)).toBe(1600);
  });

  it("шире самой крупной копии — исходник", () => {
    expect(pickVariantWidth(1920)).toBeNull();
  });
});

describe("variantKey", () => {
  it("кладёт копию рядом с исходником, всегда в WebP", () => {
    expect(variantKey(key, 800)).toBe(key.replace(/\.webp$/, ".w800.webp"));
    expect(variantKey("artworks/v2/abc.jpg", 400)).toBe("artworks/v2/abc.w400.webp");
  });

  it("у фото без папки v2 копий нет — и удалять нечего", () => {
    expect(variantKeys("artworks/abc.webp")).toEqual([]);
    expect(variantKeys(key)).toHaveLength(4);
  });
});

describe("imageSrcForWidth", () => {
  it("фото с копиями — адрес копии", () => {
    expect(imageSrcForWidth(url, 500)).toBe(url.replace(/\.webp$/, ".w800.webp"));
  });

  it("старое фото и файл из public/ — адрес как есть", () => {
    expect(hasVariants("/artworks/selo.jpg")).toBe(false);
    expect(imageSrcForWidth("/artworks/selo.jpg", 500)).toBe("/artworks/selo.jpg");
    expect(imageSrcForWidth("https://pub-test.r2.dev/artworks/abc.webp", 500)).toBe(
      "https://pub-test.r2.dev/artworks/abc.webp",
    );
  });
});

describe("imageLoader", () => {
  it("отдаёт копию под ширину", () => {
    expect(imageLoader({ src: url, width: 1200 })).toBe(url.replace(/\.webp$/, ".w1200.webp"));
  });

  it("без копий и шире 1600 — исходник с шириной в хвосте адреса", () => {
    expect(imageLoader({ src: url, width: 2560 })).toBe(`${url}?w=2560`);
    expect(imageLoader({ src: "/about/berlant.webp", width: 828 })).toBe(
      "/about/berlant.webp?w=828",
    );
  });
});

describe("скрипт нарезки", () => {
  // Скрипт на чистом JS повторяет правила ключей — разойдутся, и копии
  // старых фото лягут не туда, где их будет искать сайт.
  it("кладёт копии по тем же правилам, что и сайт", () => {
    expect(script.variantPrefix).toBe(variantPrefix);
    expect(script.variantWidths).toEqual([...variantWidths]);
    for (const width of variantWidths) {
      expect(script.variantKey(key, width)).toBe(variantKey(key, width));
    }
  });

  it("переносит старый ключ в папку v2", () => {
    const old = "artworks/0b5c2d1e-1f2a-4b3c-8d4e-5f6a7b8c9d0e-dom.webp";
    expect(script.upgradedKey(old)).toBe(key);
    expect(hasVariants(script.upgradedKey(old))).toBe(true);
  });
});
