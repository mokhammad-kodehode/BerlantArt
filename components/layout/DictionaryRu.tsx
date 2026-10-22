"use client";

import type { ReactNode } from "react";

import { DictionaryProvider } from "@/lib/i18n/client";
import { ruUi } from "@/lib/i18n/ru-ui";

/**
 * Русские строки интерфейса для клиентских компонентов (тикет О-12).
 *
 * Отдельный файл на язык намеренно: какой словарь попадёт в браузер,
 * сборщик решает по импортам. Русский корневой layout импортирует только
 * этот файл — и русские страницы не тянут английские строки.
 */
export function DictionaryRu({ children }: { children: ReactNode }) {
  return (
    <DictionaryProvider lang="ru" dictionary={ruUi}>
      {children}
    </DictionaryProvider>
  );
}
