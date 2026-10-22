"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";
import type { UiDictionary } from "@/lib/i18n/ru-ui";

/**
 * Язык и строки интерфейса в клиентском компоненте (тикет О-12).
 *
 * Строки приходят от поставщика, которого ставит корневой layout своего
 * языка: русский — components/layout/DictionaryRu.tsx, английский —
 * DictionaryEn.tsx. Каждый импортирует только свой словарь, поэтому
 * русская страница получает в браузер только русские строки. До О-12
 * хук выбирал словарь по адресу, и в код для браузера попадали оба
 * словаря целиком — вместе с текстом «О художнице» и политикой.
 *
 * Пропсом из серверного компонента словарь не передать: строки
 * с подстановкой — функции, а они не сериализуются.
 */

type Interface = { lang: Locale; t: UiDictionary };

const InterfaceContext = createContext<Interface | null>(null);

/** Поставщик строк интерфейса. Ставится только через DictionaryRu/DictionaryEn. */
export function DictionaryProvider({
  lang,
  dictionary,
  children,
}: {
  lang: Locale;
  dictionary: UiDictionary;
  children: ReactNode;
}) {
  // Словарь — постоянный объект модуля, так что значение меняется только
  // со сменой языка, а не при каждом переходе по сайту: иначе все
  // компоненты со строками перерисовывались бы на каждой странице.
  const value = useMemo(() => ({ lang, t: dictionary }), [lang, dictionary]);
  return <InterfaceContext value={value}>{children}</InterfaceContext>;
}

function useInterface(): Interface {
  const value = useContext(InterfaceContext);
  if (value === null) {
    throw new Error(
      "Строки интерфейса недоступны: компонент отрисован вне поставщика словаря. " +
        "Корневой layout должен передавать RootDocument поставщика своего языка.",
    );
  }
  return value;
}

export function useLocale(): Locale {
  return useInterface().lang;
}

export function useDictionary(): UiDictionary {
  return useInterface().t;
}
