import { describe, expect, it } from "vitest";

import { absoluteUrl, artworkJsonLd, serializeJsonLd, sitemapEntries } from "@/lib/seo";

/**
 * Карта сайта и разметка для поисковиков ломаются незаметно: страница
 * выглядит как прежде, а Google молча не видит новую работу или цену.
 * Поэтому проверяем то, что уходит поисковику, а не разметку страницы.
 */
const base = "https://www.berlant-art.com";

const work = {
  base,
  lang: "ru" as const,
  artform: "Живопись",
  id: "w1",
  title: "Село",
  description: null,
  technique: "Холст, масло",
  dimensions: "40 × 40 см",
  year: 2026,
  price: 5000,
  status: "AVAILABLE" as const,
  image: "/artworks/selo.jpg",
  artistName: "Берлант Джабраилова",
};

describe("absoluteUrl", () => {
  it("достраивает относительный путь и не трогает полный адрес хранилища", () => {
    expect(absoluteUrl("/gallery", base)).toBe("https://www.berlant-art.com/gallery");
    expect(absoluteUrl("https://pub.r2.dev/a.webp", base)).toBe("https://pub.r2.dev/a.webp");
  });
});

describe("sitemapEntries", () => {
  const updatedAt = new Date("2026-10-03");
  const entries = sitemapEntries(base, [
    { id: "w1", updatedAt, image: "/artworks/selo.jpg" },
    { id: "w2", updatedAt },
  ]);
  const urls = entries.map((entry) => entry.url);

  it("содержит публичные страницы и все работы — полными адресами", () => {
    expect(urls).toContain("https://www.berlant-art.com/");
    expect(urls).toContain("https://www.berlant-art.com/gallery");
    expect(urls).toContain("https://www.berlant-art.com/gallery/w1");
    expect(urls).toContain("https://www.berlant-art.com/gallery/w2");
  });

  it("у каждой страницы есть английская версия со ссылками hreflang на обе", () => {
    expect(urls).toContain("https://www.berlant-art.com/en");
    expect(urls).toContain("https://www.berlant-art.com/en/gallery/w1");

    const ruWork = entries.find((entry) => entry.url === "https://www.berlant-art.com/gallery/w1");
    expect(ruWork?.alternates?.languages).toEqual({
      ru: "https://www.berlant-art.com/gallery/w1",
      en: "https://www.berlant-art.com/en/gallery/w1",
      "x-default": "https://www.berlant-art.com/gallery/w1",
    });
  });

  it("не пускает служебные страницы", () => {
    for (const url of urls) {
      expect(url).not.toMatch(/\/(admin|styleguide)|\/room$|\/ar$/);
    }
  });

  it("отдаёт фото работы для поиска по картинкам, а без фото — ничего", () => {
    const withPhoto = entries.find((entry) => entry.url.endsWith("/gallery/w1"));
    const withoutPhoto = entries.find((entry) => entry.url.endsWith("/gallery/w2"));

    expect(withPhoto?.images).toEqual(["https://www.berlant-art.com/artworks/selo.jpg"]);
    expect(withoutPhoto).not.toHaveProperty("images");
    expect(withPhoto?.lastModified).toEqual(updatedAt);
  });
});

describe("artworkJsonLd", () => {
  it("описывает картину с ценой и наличием", () => {
    const data = artworkJsonLd(work);

    expect(data["@type"]).toBe("VisualArtwork");
    expect(data.url).toBe("https://www.berlant-art.com/gallery/w1");
    expect(data.offers).toMatchObject({
      price: 5000,
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
    });
  });

  it("английская версия ведёт на английский адрес и помечена языком", () => {
    const data = artworkJsonLd({ ...work, lang: "en", artform: "Painting" });

    expect(data.url).toBe("https://www.berlant-art.com/en/gallery/w1");
    expect(data.inLanguage).toBe("en");
    expect(data.artform).toBe("Painting");
  });

  it("проданная — SoldOut, а не «в наличии»", () => {
    const data = artworkJsonLd({ ...work, status: "SOLD" });
    expect(data.offers).toMatchObject({ availability: "https://schema.org/SoldOut" });
  });

  it("не выдумывает: без цены нет предложения, пустые поля не пишутся вовсе", () => {
    const data = artworkJsonLd({
      ...work,
      price: null,
      year: null,
      dimensions: null,
      image: undefined,
    });

    expect(data).not.toHaveProperty("offers");
    expect(data).not.toHaveProperty("dateCreated");
    expect(data).not.toHaveProperty("size");
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("description");
  });
});

describe("serializeJsonLd", () => {
  it("не даёт названию работы закрыть тег script", () => {
    const json = serializeJsonLd(artworkJsonLd({ ...work, title: "</script><script>alert(1)" }));

    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)");
  });
});
