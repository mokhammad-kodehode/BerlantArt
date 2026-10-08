import type { Metadata } from "next";

import { RootDocument } from "@/components/layout/RootDocument";
import { NotFoundPage } from "@/components/pages/NotFoundPage";
import { getDictionary } from "@/lib/i18n";

import "./globals.css";

/**
 * 404 для адресов, не совпавших ни с одним маршрутом (например, /foo).
 *
 * Нужна, потому что корневых layout два и собрать 404 «из корня» не из
 * чего. Next отдаёт её, минуя layout, поэтому документ — свой (тот же
 * RootDocument: шрифты, тема, подвал). Язык такого адреса неизвестен:
 * страница русская, со строкой по-английски и ссылкой на английскую версию.
 */
export const metadata: Metadata = {
  title: `${getDictionary("ru").notFound.title} · ${getDictionary("ru").site.artist}`,
};

export default function GlobalNotFound() {
  return (
    <RootDocument lang="ru">
      <NotFoundPage lang="ru" englishHint />
    </RootDocument>
  );
}
