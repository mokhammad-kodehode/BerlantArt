import { describe, expect, it } from "vitest";

import {
  checkSource,
  checkUpload,
  formatBytes,
  isOwnObjectKey,
  maxFileBytes,
  maxSourceBytes,
} from "@/lib/upload-limits";
import { objectKey } from "@/lib/r2";

/**
 * Проверки файла — единственное, что стоит между чужим браузером и нашим
 * бакетом. Ошибка здесь не видна глазами: заливка пройдёт, и только счёт
 * за хранилище потом покажет, что туда клали что попало.
 */

describe("проверка выбранного файла, до сжатия", () => {
  it("принимает снимок с телефона любого из трёх форматов", () => {
    expect(checkSource({ type: "image/jpeg", size: 12_000_000 })).toBeNull();
    expect(checkSource({ type: "image/png", size: 10 })).toBeNull();
    expect(checkSource({ type: "image/webp", size: maxSourceBytes })).toBeNull();
  });

  it("отвергает не-картинку и гиганта, который подвесил бы вкладку", () => {
    expect(checkSource({ type: "application/pdf", size: 10 })).toContain("не поддерживается");
    expect(checkSource({ type: "image/jpeg", size: maxSourceBytes + 1 })).toContain("не открыть");
  });
});

describe("проверка файла для хранилища", () => {
  it("пропускает то, что нужно, и отвергает остальное", () => {
    expect(checkUpload({ type: "image/webp", size: 700_000 })).toBeNull();
    expect(checkUpload({ type: "image/jpeg", size: maxFileBytes })).toBeNull();

    // Исходник в 3 МБ сюда попасть не должен: его обязан ужать браузер.
    // Прислать его мимо сжатия можно — сервер обязан отказать.
    expect(checkUpload({ type: "image/jpeg", size: 3_000_000 })).toContain("больше");
    // PNG — законный исходник, но не то, что хранится.
    expect(checkUpload({ type: "image/png", size: 10 })).toContain("не поддерживается");
    expect(checkUpload({ type: "application/pdf", size: 10 })).toContain("не поддерживается");
    expect(checkUpload({ type: "image/svg+xml", size: 10 })).toContain("не поддерживается");
    expect(checkUpload({ type: "", size: 10 })).toContain("не поддерживается");
  });

  it("отвергает файл на байт больше лимита", () => {
    // Ровно на границе — самый частый случай ошибки «на единицу».
    expect(checkUpload({ type: "image/webp", size: maxFileBytes + 1 })).toContain("больше");
  });

  it("показывает вес с десятыми", () => {
    // Целые мегабайты соврали бы: файл в 10.4 МБ выглядел бы ровно
    // десятимегабайтным, то есть допустимым.
    expect(formatBytes(10.4 * 1024 * 1024)).toBe("10.4 МБ");
    expect(formatBytes(1024 * 1024)).toBe("1 МБ");
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
