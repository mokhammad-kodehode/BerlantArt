import { Cormorant_Garamond, Manrope } from "next/font/google";

/*
 * Шрифты сайта — в отдельном модуле, потому что корневых layout два:
 * русский (app/(ru)/layout.tsx) и английский (app/(en)/en/layout.tsx).
 * Next загружает шрифт один раз, сколько бы модулей его ни импортировали.
 */

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
export const cormorant = Cormorant_Garamond({
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
export const manrope = Manrope({
  variable: "--font-body-family",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});
