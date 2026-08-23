import type { Metadata } from "next";
import { Literata, Manrope } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { site } from "@/lib/site";

import "./globals.css";

/**
 * Заголовочная антиква. В макете стоял Caprasimo, договаривались на Fraunces —
 * но ни тот, ни другой не имеют кириллицы (только latin/latin-ext/vietnamese),
 * а сайт целиком на русском. Literata — ближайшая по характеру: та же тёплая
 * книжная пластика, переменное начертание, полный кириллический набор.
 */
const literata = Literata({
  variable: "--font-heading-family",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

/** Гротеск для текста — роль Work Sans, тоже с кириллицей. */
const manrope = Manrope({
  variable: "--font-body-family",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.artist} — художница из Чеченской Республики`,
    template: `%s · ${site.artist}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.artist} — художница`,
    description: site.description,
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${literata.variable} ${manrope.variable} h-full antialiased`}>
      {/*
        Хедер намеренно НЕ здесь: на главной он прозрачный и лежит поверх
        hero-изображения, на внутренних страницах — тёмный и липкий. Каждая
        страница подключает <Header> сама с нужным вариантом. Подвал одинаков
        везде, поэтому он тут.
      */}
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
