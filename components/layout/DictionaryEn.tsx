"use client";

import type { ReactNode } from "react";

import { DictionaryProvider } from "@/lib/i18n/client";
import { enUi } from "@/lib/i18n/en-ui";

/** Английские строки интерфейса — устройство описано в DictionaryRu.tsx. */
export function DictionaryEn({ children }: { children: ReactNode }) {
  return (
    <DictionaryProvider lang="en" dictionary={enUi}>
      {children}
    </DictionaryProvider>
  );
}
