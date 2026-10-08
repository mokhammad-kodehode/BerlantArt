import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { paintingYear } from "@/lib/site";

/** «Пишет седьмой год» обязан сам стать «восьмым» с Новым годом. */
describe("paintingYear", () => {
  it("2020-й — первый год, 2026-й — седьмой, 2027-й — восьмой", () => {
    expect(paintingYear(new Date("2020-06-01"))).toBe(1);
    expect(paintingYear(new Date("2026-10-08"))).toBe(7);
    expect(paintingYear(new Date("2027-01-15"))).toBe(8);
  });

  it("называет год словом на обоих языках, а дальше двадцатого — цифрой", () => {
    expect(ru.hero.yearOrdinal(7)).toBe("седьмой");
    expect(en.hero.yearOrdinal(8)).toBe("eighth");
    expect(ru.hero.yearOrdinal(21)).toBe("21-й");
  });

  it("вставляет год в текст первого экрана", () => {
    expect(ru.hero.story("седьмой")).toContain("уже седьмой год");
    expect(en.hero.story("seventh")).toContain("now in her seventh year");
  });
});
