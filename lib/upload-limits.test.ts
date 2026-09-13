import { describe, expect, it } from "vitest";

import { checkUpload, formatBytes, isOwnObjectKey, maxFileBytes } from "@/lib/upload-limits";
import { objectKey } from "@/lib/r2";

/**
 * Проверки файла — единственное, что стоит между чужим браузером и нашим
 * бакетом. Ошибка здесь не видна глазами: заливка пройдёт, и только счёт
 * за хранилище потом покажет, что туда клали что попало.
 */

describe("проверка файла", () => {
  it("пропускает то, что нужно, и отвергает остальное", () => {
    expect(checkUpload({ type: "image/jpeg", size: 3_000_000 })).toBeNull();
    expect(checkUpload({ type: "image/png", size: 10 })).toBeNull();
    expect(checkUpload({ type: "image/webp", size: maxFileBytes })).toBeNull();

    expect(checkUpload({ type: "application/pdf", size: 10 })).toContain("не поддерживается");
    expect(checkUpload({ type: "image/svg+xml", size: 10 })).toContain("не поддерживается");
    expect(checkUpload({ type: "", size: 10 })).toContain("не поддерживается");
  });

  it("отвергает файл на байт больше лимита", () => {
    // Ровно на границе — самый частый случай ошибки «на единицу».
    expect(checkUpload({ type: "image/jpeg", size: maxFileBytes + 1 })).toContain("больше");
  });

  it("показывает вес с десятыми", () => {
    // Целые мегабайты соврали бы: файл в 10.4 МБ выглядел бы ровно
    // десятимегабайтным, то есть допустимым.
    expect(formatBytes(10.4 * 1024 * 1024)).toBe("10.4 МБ");
  });
});

describe("ключ объекта", () => {
  it("узнаёт ключи, которые выдал сам", () => {
    for (const name of ["Башни в тумане.JPG", "photo.png", "。。。.webp", "IMG_0001.jpeg"]) {
      const key = objectKey(name, "image/jpeg");
      expect(isOwnObjectKey(key), key).toBe(true);
    }
  });

  it("не принимает чужое и подставное", () => {
    // Ключ приходит из браузера: прислать можно что угодно, в том числе
    // указывающее на чужой объект или наверх по дереву.
    const bad = [
      "artworks/../secret.jpg",
      "secret.jpg",
      "/artworks/nochnoy-svet.jpg",
      "artworks/0d2f1e8a-0000-0000-0000-000000000000.exe",
      "artworks/не-uuid-вовсе.jpg",
      "artworks/0d2f1e8a-0000-0000-0000-000000000000.jpg/../../etc",
      "",
    ];

    for (const key of bad) expect(isOwnObjectKey(key), key).toBe(false);
  });

  it("не принимает путь внутри public как ключ хранилища", () => {
    // У пяти старых работ в поле лежит локальный путь. Спутай их —
    // и удаление работы полезло бы стирать из бакета несуществующий
    // объект, а то и наоборот.
    expect(isOwnObjectKey("/artworks/bashni-v-tumane.jpg")).toBe(false);
  });
});
