/**
 * Языки сайта и адреса страниц на каждом из них (этап 10, TICKETS-en.md).
 *
 * Русский — основной и без приставки (`/gallery`), английский — с `/en`
 * (`/en/gallery`). Решение заказчика от 4 октября 2026: уже разосланные
 * ссылки и проиндексированные адреса не ломаются.
 *
 * Модуль без зависимостей: им пользуются и серверные страницы, и
 * клиентские компоненты (переключатель языка, шапка).
 */

export const locales = ["ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

/** Атрибут `lang` и локаль Open Graph для каждого языка. */
export const localeMeta: Record<Locale, { htmlLang: string; ogLocale: string }> = {
  ru: { htmlLang: "ru", ogLocale: "ru_RU" },
  en: { htmlLang: "en", ogLocale: "en_US" },
};

/**
 * Адрес страницы на нужном языке: `localePath("en", "/gallery")` →
 * `/en/gallery`, главная на английском — `/en`, а не `/en/`.
 * `path` — русский адрес без приставки.
 */
export function localePath(lang: Locale, path: string): string {
  if (lang === defaultLocale) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/**
 * Обратное к `localePath`: какой язык у адреса и какой у него «русский»
 * путь. Нужно переключателю языка — с `/en/gallery/x` он ведёт на
 * `/gallery/x`, на ту же страницу, а не на главную.
 */
export function splitLocale(pathname: string): { lang: Locale; path: string } {
  for (const lang of locales) {
    if (lang === defaultLocale) continue;
    if (pathname === `/${lang}`) return { lang, path: "/" };
    if (pathname.startsWith(`/${lang}/`)) return { lang, path: pathname.slice(lang.length + 1) };
  }
  return { lang: defaultLocale, path: pathname };
}
