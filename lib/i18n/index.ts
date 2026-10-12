import type { Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { ru, type Dictionary } from "@/lib/i18n/ru";

export { defaultLocale, localeMeta, localePath, locales, splitLocale } from "@/lib/i18n/config";
export type { Locale } from "@/lib/i18n/config";
export type { Dictionary } from "@/lib/i18n/ru";

const dictionaries: Record<Locale, Dictionary> = { ru, en };

/** Словарь языка. Синхронно: оба словаря маленькие, грузить их по частям незачем. */
export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}

/**
 * Значение из базы на языке страницы: категория «Село» → «Village».
 * Нет перевода — показываем как есть: новая категория, заведённая
 * в админке, лучше по-русски, чем с выдуманным переводом.
 */
export function translateValue(table: Record<string, string>, value: string): string {
  return table[value] ?? value;
}
