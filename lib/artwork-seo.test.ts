import { describe, expect, it } from "vitest";

import { artworkSeo } from "@/lib/artworks";

/**
 * Тексты для выдачи собираются из данных — и ломаются незаметно: страница
 * выглядит как прежде, а в Google у картины висит цена, которой на сайте
 * нет, или у картины без размера — лишняя запятая.
 */
const work = {
  title: "Село",
  description: "Сельская атмосфера",
  technique: "Холст, масло",
  dimensions: "40 × 40 см",
  year: 2026,
};

describe("artworkSeo", () => {
  it("собирает заголовок, описание и подпись по-русски", () => {
    const seo = artworkSeo(work);

    expect(seo.title).toBe("Село — картина маслом, 40 × 40 см");
    expect(seo.description).toBe(
      "Картина «Село»: холст, масло, 40 × 40 см, 2026. Автор — чеченская художница Берлант Джабраилова. Сельская атмосфера",
    );
    expect(seo.imageAlt).toBe("«Село» — картина маслом Берлант Джабраиловой");
  });

  it("по-английски — без русского описания из админки", () => {
    const seo = artworkSeo(work, "en");

    expect(seo.title).toBe("Село — oil painting, 40 × 40 cm");
    expect(seo.description).toBe(
      "“Село”: oil on canvas, 40 × 40 cm, 2026. By Chechen artist Berlant Dzhabrailova.",
    );
  });

  it("не выдумывает: без размера и года — без них", () => {
    const seo = artworkSeo({ ...work, dimensions: null, year: null, description: null });

    expect(seo.title).toBe("Село — картина маслом");
    expect(seo.description).toBe(
      "Картина «Село»: холст, масло. Автор — чеченская художница Берлант Джабраилова.",
    );
  });

  it("не пишет цену и статус, даже если они заполнены в админке", () => {
    // Страница отдаёт сюда строку из базы целиком — с ценой и статусом.
    // Продажа на сайте выключена (ARCHITECTURE.md), и в выдаче их быть не должно.
    const fromDb = { ...work, price: 5000, status: "SOLD" as const };
    const { description } = artworkSeo(fromDb);

    expect(description).not.toMatch(/₽|5\s?000|Цена|Продана|В наличии/);
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
