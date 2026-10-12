import { RootDocument } from "@/components/layout/RootDocument";
import { rootMetadata } from "@/lib/page-metadata";

import "../globals.css";

/**
 * Корневой layout русской версии — основной, адреса без приставки.
 * Английская — app/(en)/en/layout.tsx; общее у них — RootDocument.
 */
export const metadata = rootMetadata("ru");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <RootDocument lang="ru">{children}</RootDocument>;
}
