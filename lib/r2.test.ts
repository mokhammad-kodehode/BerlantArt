import { describe, expect, it } from "vitest";

import { imageUrl } from "@/lib/artworks";
import { objectKey } from "@/lib/r2";

describe("objectKey", () => {
  it("транслитерирует кириллицу и приводит имя к латинице", () => {
    expect(objectKey("Башни в тумане.JPG", "image/jpeg")).toMatch(
      /^artworks\/[0-9a-f-]{36}-bashni-v-tumane\.jpg$/,
    );
  });

  it("берёт расширение из типа файла, а не из имени", () => {
    // Имя обещает jpg, тип файла говорит webp. Верить надо типу: имя пришло
    // из браузера и подделывается свободно.
    expect(objectKey("photo.jpg", "image/webp")).toMatch(/\.webp$/);
  });

  it("не выпускает наружу путь вверх по дереву", () => {
    const key = objectKey("../../secret.png", "image/png");

    expect(key).not.toContain("..");
    expect(key.startsWith("artworks/")).toBe(true);
  });

  it("обходится без имени, когда после очистки не осталось ни одного символа", () => {
    expect(objectKey("。。。.png", "image/png")).toMatch(/^artworks\/[0-9a-f-]{36}\.png$/);
  });
});

describe("imageUrl", () => {
  it("отдаёт локальный путь как есть", () => {
    expect(imageUrl("/artworks/bashni-v-tumane.jpg")).toBe("/artworks/bashni-v-tumane.jpg");
  });

  it("собирает адрес бакета из ключа", () => {
    expect(imageUrl("artworks/abc.jpg")).toBe("https://pub-test.r2.dev/artworks/abc.jpg");
  });
});
