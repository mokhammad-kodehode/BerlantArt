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
    /*
      suppressHydrationWarning — из-за атрибута темы: скрипт ниже ставит
      data-theme на <html> до гидратации, и React видит на клиенте атрибут,
      которого не было в серверной разметке. Узнать выбор зала на сервере
      нельзя — он в localStorage браузера. Подавление действует только на
      сам этот элемент, содержимое страницы проверяется как обычно.
    */
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${literata.variable} ${manrope.variable} h-full antialiased`}
    >
      {/*
        Хедер намеренно НЕ здесь: на главной он прозрачный и лежит поверх
        hero-изображения, на внутренних страницах — тёмный и липкий. Каждая
        страница подключает <Header> сама с нужным вариантом. Подвал одинаков
        везде, поэтому он тут.
      */}
      <body className="flex min-h-full flex-col">
        {/*
          Выбранный зал применяется до гидратации, иначе страница мигнёт
          тёмным и только потом станет белой. Узнать выбор на сервере нельзя —
          он лежит в localStorage браузера, поэтому это встроенный скрипт,
          а не компонент: любой React-код выполнился бы уже после отрисовки.

          Обычным тегом, а не через next/script: со стратегией
          beforeInteractive Next ставит в разметку только предзагрузку,
          а сам файл подтягивает своим загрузчиком — на медленной сети
          страница успела бы нарисоваться тёмной. Проверено curl'ом:
          инлайн-содержимое next/script в серверную разметку не попадает
          вовсе, а этот тег попадает и выполняется парсером.

          Цена — предупреждение React в консоли разработки («scripts inside
          React components are never executed»): на клиентских переходах тег
          действительно не выполняется, но нам это и не нужно — зал уже
          применён. В боевой сборке предупреждений React нет.

          Ключ и значения те же, что в components/ui/ThemeSwitch.tsx.
          Тёмный зал — умолчание в CSS, для него атрибут не нужен.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var h=localStorage.getItem("hall");if(h==="paper"||h==="white")document.documentElement.dataset.theme=h}catch(e){}`,
          }}
        />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
