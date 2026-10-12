import type { Metadata } from "next";

import { NotFoundPage } from "@/components/pages/NotFoundPage";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: getDictionary("ru").notFound.title,
};

export default function NotFound() {
  return <NotFoundPage lang="ru" />;
}
