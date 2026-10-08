import type { Metadata } from "next";

import { AboutPage } from "@/components/pages/AboutPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("en").about;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: pageAlternates("en", "/about"),
};

/**
 * Раз в сутки страница перестраивается: в тексте «пишет седьмой год»
 * (lib/site.ts, paintingYear), и с Новым годом он должен смениться сам,
 * без выкладки. Литерал — Next читает значение при сборке.
 */
export const revalidate = 86400;

export default function Page() {
  return <AboutPage lang="en" />;
}
