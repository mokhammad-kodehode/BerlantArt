import { describe, expect, it, vi } from "vitest";

import { isFeedList, positionOf } from "@/lib/artwork-thumbs";
import { artworkFeedItem, artworkLabel, labelDescription } from "@/lib/artworks";

// lib/artworks.ts тянет клиент базы; самой базы в тестах нет, и ни
// один из проверяемых здесь вызовов в неё не ходит.
vi.mock("@/lib/db", () => ({ db: {} }));

const works = (...ids: string[]) => ids.map((id) => ({ id }));

const work = {
  id: "w1",
  title: "Город",
  description: null,
  technique: "Холст, масло",
  dimensions: "50 × 50 см",
  year: 2023,
  // Путь от корня — фото из public/: адрес остаётся как есть, без бакета.
  images: [
    { url: "/artworks/gorod.jpg", width: 1200, height: 1500 },
    { url: "/artworks/gorod-detal.jpg", width: 800, height: 800 },
  ],
};

describe("artworkLabel — строка таблички", () => {
  it("техника, размер, год — в порядке музейной этикетки", () => {
    expect(artworkLabel(work, "ru")).toBe("Холст, масло · 50 × 50 см · 2023");
    expect(artworkLabel(work, "en")).toBe("Oil on canvas · 50 × 50 cm · 2023");
  });

  it("неизвестное поле выпадает целиком — без прочерков и висящих точек", () => {
    expect(artworkLabel({ ...work, dimensions: null }, "ru")).toBe("Холст, масло · 2023");
    expect(artworkLabel({ ...work, year: null }, "ru")).toBe("Холст, масло · 50 × 50 см");
    expect(artworkLabel({ technique: null, dimensions: null, year: null }, "ru")).toBe("");
  });
});

describe("labelDescription — описание на табличке", () => {
  it("настоящее описание показывается", () => {
    const text = "Соломенные крыши под высокими деревьями";
    expect(labelDescription({ title: "Село", description: text }, "ru")).toBe(text);
  });

  it("описание, повторяющее название, не показывается — иначе название стояло бы дважды", () => {
    expect(labelDescription({ title: "Мечеть", description: "Мечеть" }, "ru")).toBeNull();
    expect(labelDescription({ title: "Мечеть", description: " мечеть " }, "ru")).toBeNull();
  });

  it("пустого описания и английской версии нет", () => {
    expect(labelDescription({ title: "Село", description: "  " }, "ru")).toBeNull();
    expect(labelDescription({ title: "Село", description: null }, "ru")).toBeNull();
    expect(labelDescription({ title: "Село", description: "Сельская атмосфера" }, "en")).toBeNull();
  });
});

describe("artworkFeedItem — картина ленты", () => {
  it("главное фото с пропорциями, остальные — «другие ракурсы»", () => {
    const item = artworkFeedItem(work);
    expect(item.src).toBe("/artworks/gorod.jpg");
    expect(item.ratio).toBeCloseTo(0.8);
    expect(item.extra).toEqual(["/artworks/gorod-detal.jpg"]);
    expect(item.label.ru).toBe("Холст, масло · 50 × 50 см · 2023");
  });

  it("без размеров фото пропорций нет — лента впишет картину в квадрат", () => {
    const item = artworkFeedItem({
      ...work,
      images: [{ url: "/a.jpg", width: null, height: null }],
    });
    expect(item.ratio).toBeNull();
    expect(item.extra).toEqual([]);
  });

  it("собранная картина проходит проверку формы, которой её встречает браузер", () => {
    expect(isFeedList([artworkFeedItem(work)])).toBe(true);
  });

  it("значок камеры — только у картины, которую можно показать в настоящем размере", () => {
    // Фото 1200 × 1500 — пропорции 4:5, как у холста 40 × 50.
    expect(artworkFeedItem({ ...work, dimensions: "40 × 50 см" }).arVersion).toMatch(
      /^[0-9a-f]{12}$/,
    );
    // Размер, вписанный от руки, тоже читается (23.10.2026).
    const square = { ...work, images: [{ url: "/a.jpg", width: 1000, height: 1000 }] };
    expect(artworkFeedItem({ ...square, dimensions: "120/120" }).arVersion).not.toBeNull();
    // Квадратный холст на вытянутом фото — в камере вышла бы не та картина.
    expect(artworkFeedItem(work).arVersion).toBeNull();
    expect(artworkFeedItem({ ...work, dimensions: null }).arVersion).toBeNull();
  });
});

describe("isFeedList — форма общего списка", () => {
  it("старая копия списка (только id, название и фото) не проходит — лента бы на ней упала", () => {
    expect(isFeedList([{ id: "a", title: "Город", src: "/a.jpg" }])).toBe(false);
  });

  it("список, собранный до 23.10.2026 (без версии модели), проходит — камеры просто нет", () => {
    const { arVersion, ...old } = artworkFeedItem(work);
    expect(arVersion).toBeNull();
    expect(isFeedList([old])).toBe(true);
    expect(isFeedList([{ ...old, arVersion: 12 }])).toBe(false);
  });

  it("не список — не проходит", () => {
    expect(isFeedList(null)).toBe(false);
    expect(isFeedList({ id: "a" })).toBe(false);
  });
});

describe("positionOf", () => {
  it("номер с единицы и общее число", () => {
    expect(positionOf(works("a", "b", "c"), "b")).toEqual({ position: 2, total: 3 });
  });

  it("работы нет в списке — номера нет", () => {
    expect(positionOf(works("a"), "x")).toBeNull();
  });
});
