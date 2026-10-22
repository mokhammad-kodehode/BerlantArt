import { DictionaryEn } from "@/components/layout/DictionaryEn";
import { RootDocument } from "@/components/layout/RootDocument";
import { rootMetadata } from "@/lib/page-metadata";

import "../../globals.css";

/**
 * Корневой layout английской версии — все её адреса начинаются с /en
 * (решение заказчика от 4 октября 2026). Свой корневой layout, а не
 * вложенный в русский: у английских страниц должен быть `<html lang="en">`.
 */
export const metadata = rootMetadata("en");

export default function EnglishRootLayout({ children }: LayoutProps<"/en">) {
  return (
    <RootDocument lang="en" Dictionary={DictionaryEn}>
      {children}
    </RootDocument>
  );
}
