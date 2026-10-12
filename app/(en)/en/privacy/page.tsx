import type { Metadata } from "next";

import { PrivacyPage } from "@/components/pages/PrivacyPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("en").privacy;

export const metadata: Metadata = {
  title: t.title,
  description: t.metaDescription,
  alternates: pageAlternates("en", "/privacy"),
};

export default function Page() {
  return <PrivacyPage lang="en" />;
}
