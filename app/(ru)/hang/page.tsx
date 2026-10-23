import type { Metadata } from "next";

import { HangPage } from "@/components/pages/HangPage";
import { hangPath } from "@/lib/fitting-works";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("ru").hangPage;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: pageAlternates("ru", hangPath),
};

/**
 * В базу страница не ходит — список работ берёт браузер (HangPage), — так
 * что собирается один раз при сборке и пересборки не требует.
 */
export default function Page() {
  return <HangPage />;
}
