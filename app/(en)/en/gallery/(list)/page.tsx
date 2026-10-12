import type { Metadata } from "next";

import { GalleryPage } from "@/components/pages/GalleryPage";
import { getDictionary } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

const t = getDictionary("en").gallery;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  // Фильтры дают десятки адресов (?status=…&category=…) с той же стеной.
  // Канонический у всех один — иначе поисковик сочтёт их копиями.
  alternates: pageAlternates("en", "/gallery"),
};

export default function Page({ searchParams }: PageProps<"/en/gallery">) {
  return <GalleryPage lang="en" searchParams={searchParams} />;
}
