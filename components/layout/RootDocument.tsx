import type { ReactNode } from "react";

import { AdminReturnBar } from "@/components/layout/AdminReturnBar";
import { Footer } from "@/components/layout/Footer";
import { cormorant, manrope } from "@/lib/fonts";
import { localeMeta, type Locale } from "@/lib/i18n";

/**
 * Документ целиком — <html> и <body> — для обоих корневых layout.
 *
 * Корневых layout два (русский и английский), потому что у каждой версии
 * свой `<html lang>`: поисковику он говорит, на каком языке страница,
 * а скринридеру — каким голосом её читать. Всё остальное у них общее
 * и живёт здесь, чтобы версии не разошлись.
 */
export function RootDocument({ lang, children }: { lang: Locale; children: ReactNode }) {
  return (
    /*
      suppressHydrationWarning — из-за атрибута темы: скрипт ниже ставит
      data-theme на <html> до гидратации, и React видит на клиенте атрибут,
      которого не было в серверной разметке. Узнать выбор зала на сервере
      нельзя — он в localStorage браузера. Подавление действует только на
      сам этот элемент, содержимое страницы проверяется как обычно.
    */
    <html
      lang={localeMeta[lang].htmlLang}
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
        <Footer lang={lang} />
        <AdminReturnBar />
      </body>
    </html>
  );
}
