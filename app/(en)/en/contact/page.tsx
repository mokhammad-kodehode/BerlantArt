import type { Metadata } from "next";

import { ContactPage } from "@/components/pages/ContactPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("en").contactPage;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: pageAlternates("en", "/contact"),
};

/**
 * Как у главной: страница готовится заранее, обновляется после правки
 * в админке и раз в сутки на всякий случай.
 * Запрос в базу здесь один — картина, «приколотая» к фотографии, — и уснувшая
 * база не должна ронять страницу, по которой художнице пишут.
 */
export const revalidate = 86400;

export default function Page() {
  return <ContactPage lang="en" />;
}
