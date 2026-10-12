import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";

/**
 * Девиз на первом экране набран двумя кусками — второй подчёркнут
 * мазком, — а в подвале и на «О художнице» стоит целиком (`site.slogan`).
 * Поправят одно и забудут другое — на сайте окажутся два разных девиза.
 */
describe("девиз первого экрана", () => {
  it.each([
    ["ru", ru],
    ["en", en],
  ])("%s: две части вместе — это site.slogan", (_lang, dictionary) => {
    const { lead, accent } = dictionary.hero.motto;
    expect(`${lead} ${accent}`).toBe(dictionary.site.slogan);
  });
});
