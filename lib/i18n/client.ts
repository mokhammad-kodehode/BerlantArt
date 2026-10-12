"use client";

import { usePathname } from "next/navigation";

import { splitLocale, type Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { ru, type Dictionary } from "@/lib/i18n/ru";

/**
 * Язык и словарь в клиентском компоненте — по адресу страницы.
 *
 * По адресу, а не пропсом: словарь содержит функции (строки с
 * подстановкой), а их из серверного компонента в клиентский передать
 * нельзя. Адрес клиентский компонент знает и сам.
 */
export function useLocale(): Locale {
  return splitLocale(usePathname()).lang;
}

export function useDictionary(): Dictionary {
  return useLocale() === "en" ? en : ru;
}
