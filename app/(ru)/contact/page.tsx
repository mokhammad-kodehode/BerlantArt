import type { Metadata } from "next";

import { ContactPage } from "@/components/pages/ContactPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("ru").contactPage;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: pageAlternates("ru", "/contact"),
};

/**
 * Как у главной: страница готовится заранее и обновляется раз в пять минут.
 * Запрос в базу здесь один — картина, «приколотая» к фотографии, — и уснувшая
 * база не должна ронять страницу, по которой художнице пишут.
 */
export const revalidate = 300;

export default function Page() {
  return <ContactPage lang="ru" />;
}
