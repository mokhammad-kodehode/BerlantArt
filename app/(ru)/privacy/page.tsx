import type { Metadata } from "next";

import { PrivacyPage } from "@/components/pages/PrivacyPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("ru").privacy;

export const metadata: Metadata = {
  title: t.title,
  description: t.metaDescription,
  alternates: pageAlternates("ru", "/privacy"),
};

export default function Page() {
  return <PrivacyPage lang="ru" />;
}
