import { describe, expect, it } from "vitest";

import { birthdayCardYear, greeting, pickWarmWords, warmWords } from "@/lib/admin-cheer";

/** Сервер живёт по Гринвичу, художница — по Москве: разница три часа. */
describe("greeting", () => {
  it("считает время по Москве, а не по серверу", () => {
    // 06:00 по Гринвичу — 09:00 в Грозном.
    expect(greeting(new Date("2026-10-13T06:00:00Z"))).toBe("Доброе утро");
    expect(greeting(new Date("2026-10-13T10:00:00Z"))).toBe("Добрый день");
    expect(greeting(new Date("2026-10-13T16:00:00Z"))).toBe("Добрый вечер");
    expect(greeting(new Date("2026-10-13T21:00:00Z"))).toBe("Доброй ночи");
  });

  it("границы: пять утра — уже утро, одиннадцать вечера — уже ночь", () => {
    expect(greeting(new Date("2026-10-13T01:59:00Z"))).toBe("Доброй ночи");
    expect(greeting(new Date("2026-10-13T02:00:00Z"))).toBe("Доброе утро");
    expect(greeting(new Date("2026-10-13T20:00:00Z"))).toBe("Доброй ночи");
  });
});

describe("pickWarmWords", () => {
  it("не повторяет прошлую фразу", () => {
    for (const previous of warmWords) {
      for (const r of [0, 0.5, 0.999]) {
        expect(pickWarmWords(previous, () => r)).not.toBe(previous);
      }
    }
  });

  it("без прошлой фразы выбирает из всех", () => {
    expect(pickWarmWords(undefined, () => 0)).toBe(warmWords[0]);
    expect(pickWarmWords(undefined, () => 0.999)).toBe(warmWords.at(-1));
  });
});

/** Открытка ждёт с 26 марта по Грозному, а не по Гринвичу, и месяц после. */
describe("birthdayCardYear", () => {
  it("с 26 марта — ждёт, 25-го — ещё нет", () => {
    expect(birthdayCardYear(new Date("2027-03-26T09:00:00Z"))).toBe(2027);
    expect(birthdayCardYear(new Date("2027-03-25T09:00:00Z"))).toBeNull();
  });

  it("день начинается в полночь по Москве: 21:00 по Гринвичу 25-го — уже 26-е", () => {
    expect(birthdayCardYear(new Date("2027-03-25T21:00:00Z"))).toBe(2027);
    expect(birthdayCardYear(new Date("2027-03-25T20:59:00Z"))).toBeNull();
  });

  it("не зашла 26-го — дождётся и в апреле, но не через полгода", () => {
    expect(birthdayCardYear(new Date("2027-04-10T09:00:00Z"))).toBe(2027);
    expect(birthdayCardYear(new Date("2027-04-24T09:00:00Z"))).toBe(2027);
    expect(birthdayCardYear(new Date("2027-04-25T09:00:00Z"))).toBeNull();
    expect(birthdayCardYear(new Date("2027-12-01T09:00:00Z"))).toBeNull();
  });
});
