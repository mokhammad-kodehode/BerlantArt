import type { Metadata } from "next";

import { AboutPage } from "@/components/pages/AboutPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("ru").about;

export const metadata: Metadata = {
  title: t.title,
  description: t.metaDescription,
  alternates: pageAlternates("ru", "/about"),
};

export default function Page() {
  return <AboutPage lang="ru" />;
}
