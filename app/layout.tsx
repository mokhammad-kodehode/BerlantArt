import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { AdminReturnBar } from "@/components/layout/AdminReturnBar";
import { Footer } from "@/components/layout/Footer";
import { site } from "@/lib/site";

import "./globals.css";

/**
 * Заголовочная антиква — Cormorant Garamond: классическая гарнитура
 * в духе гарамонов, «музейная» (решение заказчика 3 октября 2026, выбор
 * из пяти пар на одной карточке работы).
 *
 * Заменила Oranienbaum: у того тонкие линии букв в мелком размере почти
 * пропадали, текст казался бледным, а начертание было одно и без курсива.
 * Cormorant тоже тонкий, поэтому заголовки идут весом 600, а не 400
 * (--font-heading-weight в globals.css), — на 400 он бледнел бы так же.
 * Курсив подключён: Oranienbaum его не имел, и девиз пришлось набирать
 * разрядкой.
 */
const cormorant = Cormorant_Garamond({
  variable: "--font-heading-family",
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * Гротеск на всё, кроме заголовков, — Manrope: текст, кнопки, поля,
 * фильтры. Выбран в паре с Cormorant: у них общая геометричная
 * спокойность, а Golos Text рядом с гарамоном смотрелся слишком
 * «интерфейсно». Шрифтов по-прежнему два: два похожих гротеска рядом
 * заказчик уже однажды назвал разнобоем.
 */
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
      // Почти белый зал — умолчание сайта, поэтому стоит прямо в разметке:
      // первая отрисовка светлая без всякого скрипта. Тёмный зал в CSS
      // живёт без атрибута — скрипт ниже снимает его у тех, кто выбрал тёмный.
      data-theme="paper"
      suppressHydrationWarning
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
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
          Разметка приходит с почти белым залом; скрипт снимает атрибут,
          только если сохранён тёмный. Сохранённый «white» (третий зал,
          убран 19.09.2026) остаётся почти белым — это тот же светлый зал.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("hall")==="dark")delete document.documentElement.dataset.theme}catch(e){}`,
          }}
        />
        <div className="flex-1">{children}</div>
        <Footer />
        <AdminReturnBar />
      </body>
    </html>
  );
}
