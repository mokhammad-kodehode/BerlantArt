import { describe, expect, it } from "vitest";

import { artworkSeo } from "@/lib/artworks";

/**
 * Тексты для выдачи собираются из данных — и ломаются незаметно: страница
 * выглядит как прежде, а в Google у проданной картины стоит «В наличии»
 * или у картины без размера висит запятая.
 */
/** Цена приходит с неразрывными пробелами (Intl) — сравниваем по обычным. */
const plain = (text: string) => text.replaceAll("\u00a0", " ");

const work = {
  title: "Село",
  description: "Сельская атмосфера",
  technique: "Холст, масло",
  dimensions: "40 × 40 см",
  year: 2026,
  price: 5000,
  status: "AVAILABLE" as const,
};

describe("artworkSeo", () => {
  it("собирает заголовок, описание и подпись по-русски", () => {
    const seo = artworkSeo(work);

    expect(seo.title).toBe("Село — картина маслом, 40 × 40 см");
    expect(plain(seo.description)).toBe(
      "Картина «Село»: холст, масло, 40 × 40 см, 2026. Автор — чеченская художница Берлант Джабраилова. Цена 5 000 ₽. В наличии. Сельская атмосфера",
    );
    expect(seo.imageAlt).toBe("«Село» — картина маслом Берлант Джабраиловой");
  });

  it("по-английски — без русского описания из админки", () => {
    const seo = artworkSeo(work, "en");

    expect(seo.title).toBe("Село — oil painting, 40 × 40 cm");
    expect(seo.description).toBe(
      "“Село”: oil on canvas, 40 × 40 cm, 2026. By Chechen artist Berlant Dzhabrailova. Price ₽5,000. Available.",
    );
  });

  it("не выдумывает: без размера, года и цены — без них", () => {
    const seo = artworkSeo({
      ...work,
      dimensions: null,
      year: null,
      price: null,
      description: null,
    });

    expect(seo.title).toBe("Село — картина маслом");
    expect(seo.description).toBe(
      "Картина «Село»: холст, масло. Автор — чеченская художница Берлант Джабраилова. В наличии.",
    );
  });

  it("проданная — «Продана», а не «В наличии»", () => {
    expect(artworkSeo({ ...work, status: "SOLD" }).description).toContain("Продана.");
    expect(artworkSeo({ ...work, status: "SOLD" }).description).not.toContain("В наличии");
  });

  it("не называет картину масляной, если техника другая или не указана", () => {
    expect(artworkSeo({ ...work, technique: "Холст, акрил" }).title).toBe(
      "Село — картина, 40 × 40 см",
    );
    expect(artworkSeo({ ...work, technique: null }).imageAlt).toBe(
      "«Село» — картина Берлант Джабраиловой",
    );
  });
});
