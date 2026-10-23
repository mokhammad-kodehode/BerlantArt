import { describe, expect, it } from "vitest";

import { qrPath } from "@/lib/qr";

describe("qrPath", () => {
  const url = "https://www.berlant-art.com/gallery/cmv523qsv0002h97d1wyjw1ia/room";

  it("одна и та же ссылка — один и тот же код", () => {
    expect(qrPath(url)).toEqual(qrPath(url));
  });

  it("с полем вокруг и угловым квадратом сверху слева — камера телефона ищет его первым", () => {
    const { size, path } = qrPath(url);
    // Поле в два модуля: первый тёмный модуль — в (2, 2).
    expect(path.startsWith("M2 2h1v1h-1z")).toBe(true);
    // Код квадратный и вмещает адрес: версия больше первой (21 модуль).
    expect(size).toBeGreaterThan(21 + 4);
  });

  it("другая ссылка — другой код", () => {
    expect(qrPath(`${url}?frame=thin`).path).not.toBe(qrPath(url).path);
  });
});
