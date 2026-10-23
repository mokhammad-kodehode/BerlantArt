"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type CSSProperties, type MouseEvent, type SyntheticEvent } from "react";

import { BrushStroke } from "@/components/ui/BrushStroke";
import { ButtonLink } from "@/components/ui/Button";
import { ContactIcon } from "@/components/ui/ContactIcon";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { cn } from "@/lib/cn";
import { contactName } from "@/lib/contact-names";
import type { ContactLink } from "@/lib/contacts";
import { localePath, splitLocale } from "@/lib/i18n/config";
import { useDictionary } from "@/lib/i18n/client";
import { navCta, navItems } from "@/lib/site";

/**
 * Сколько меню исчезает перед закрытием — та же длина, что у анимаций
 * `.mobile-nav[data-closing]` в globals.css: собраться обратно в кнопку —
 * 420 мс, растаять для тех, кто просит меньше движения, — 250 мс.
 * Разойдутся — меню либо мигнёт полным перед исчезновением, либо
 * пропадёт, не доиграв.
 */
const MENU_CLOSE_MS = 420;
const MENU_FADE_MS = 250;

/** Номер пункта меню для CSS: по нему пункты появляются друг за другом. */
function itemDelay(index: number): CSSProperties & { "--i": number } {
  return { "--i": index };
}

/**
 * Шапка сайта — клиентская часть. Страницы подключают серверную обёртку
 * `Header` (components/layout/Header.tsx): она собирает контакты для меню
 * и передаёт их сюда готовыми.
 *
 * Три варианта:
 *
 * - `solid` — плашка цвета стены, липнет к верху;
 * - `stage` — страница работы. На компьютере спрятана над экраном и
 *   выезжает, когда мышь подходит к верхнему краю; на телефоне — тонкая
 *   прозрачная полоса с одним бургером. Шапка не должна отвлекать от
 *   картины (заказчик, 12.10.2026).
 *
 * Пункты меню везде под кнопкой-бургером. На телефоне — с самого начала:
 * в макете навигация переносилась по словам и занимала три строки (148px).
 * На компьютере — с 12.10.2026 (заказчик): шапка в одну строку вместо двух,
 * 86px вместо 144px, — картина и фото на первом экране крупнее.
 *
 * Меню бургера на телефоне — на весь экран (заказчик, 8.10.2026), на
 * компьютере — панель справа (12.10.2026): на экране 1900px четыре пункта
 * посреди пустого поля выглядели бы потерянными. В меню крупные пункты,
 * кнопка «Написать художнице», все способы связи и — на телефоне —
 * переключатели зала и языка (на компьютере они в шапке).
 *
 * Язык — по адресу страницы (`/en/…` — английский). Переключатель
 * ведёт на ту же страницу другого языка, а не на главную: человек,
 * открывший работу по ссылке, хочет прочитать про неё же.
 */
export function HeaderBar({
  variant = "solid",
  isWide = false,
  contacts = [],
}: {
  /**
   * solid — плашкой и липкая; stage — страница работы: спрятана, не
   * отвлекает от картины.
   */
  variant?: "solid" | "stage";
  /** Шире обычного — над стеной галереи, чтобы края совпали (--wall-max). */
  isWide?: boolean;
  /** Способы связи для меню бургера. Пусто — блока контактов нет. */
  contacts?: ContactLink[];
}) {
  const { lang, path } = splitLocale(usePathname());
  const t = useDictionary();
  const menuRef = useRef<HTMLDialogElement>(null);
  // Только для подписи кнопки и aria-expanded: открыто ли окно, знает
  // само окно, но React должен перерисовать кнопку.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isCurrent = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const otherLang = lang === "ru" ? "en" : "ru";

  /**
   * Меню — встроенный в браузер `<dialog>`, как просмотр картины: окно
   * поверх всего, ловушка фокуса, закрытие по Esc и неактивная страница
   * под ним — всё это браузер делает сам.
   *
   * Фокус — на само окно, а не на первую ссылку: иначе на телефоне
   * «Главная» открывалась бы с обводкой фокуса, будто выбрана (та же
   * история, что со стрелкой в просмотре картины).
   */
  function openMenu(event: MouseEvent<HTMLButtonElement>): void {
    const menu = menuRef.current;
    if (!menu) return;
    // Меню растекается кругом из самой кнопки: центр круга — её середина
    // (globals.css, .mobile-nav). Окно во весь экран, поэтому координаты
    // кнопки на экране — это и координаты внутри окна.
    const button = event.currentTarget.getBoundingClientRect();
    menu.style.setProperty("--menu-x", `${button.left + button.width / 2}px`);
    menu.style.setProperty("--menu-y", `${button.top + button.height / 2}px`);
    menu.showModal();
    menu.focus();
    setIsMenuOpen(true);
  }

  /** Закрыть сразу — при переходе по ссылке: страница всё равно сменится. */
  function closeMenu(): void {
    menuRef.current?.close();
  }

  /**
   * Закрыть с движением обратно в кнопку — крестиком и Esc. Окно
   * закрывается после анимации, а не до: иначе сжиматься было бы нечему.
   * Сначала close(), потом снять пометку — в обратном порядке на кадр
   * мелькнуло бы полное меню. Кто просит меньше движения — меню просто
   * тает, без сжатия.
   */
  function dismissMenu(): void {
    const menu = menuRef.current;
    if (!menu || menu.dataset.closing !== undefined) return;
    const isCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    menu.dataset.closing = "";
    setTimeout(
      () => {
        menu.close();
        delete menu.dataset.closing;
      },
      isCalm ? MENU_FADE_MS : MENU_CLOSE_MS,
    );
  }

  // Esc браузер закрыл бы сразу — перехватываем, чтобы закрыть с движением.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    dismissMenu();
  }

  // Короткая подпись (EN / RU), чтобы не теснить строку меню на 1024px;
  // полное название языка — в aria-label и подсказке. hrefLang и lang
  // говорят браузеру и поисковику, что по ссылке другой язык.
  const languageLink = (className: string) => (
    <Link
      href={localePath(otherLang, path)}
      hrefLang={otherLang}
      lang={otherLang}
      aria-label={t.nav.switchToLabel}
      title={t.nav.switchTo}
      className={className}
      onClick={closeMenu}
    >
      {otherLang.toUpperCase()}
    </Link>
  );

  // Бургер один и тот же на телефоне и на компьютере — разметка общая.
  const burgerButton = (
    <button
      type="button"
      onClick={openMenu}
      aria-expanded={isMenuOpen}
      aria-controls="mobile-nav"
      aria-label={t.nav.openMenu}
      className="burger flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-current"
    >
      {/* Два мазка вместо трёх ровных полосок (заказчик, 9.10.2026,
          вариант «Б»): неровные края и сужение к концу — как у мазка
          под пунктом меню, разной длины — нижний короче. При наведении
          мазки тянутся (globals.css, .burger-stroke). Крестик в открытом
          меню нарисован теми же мазками. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26" fill="currentColor">
        <path
          className="burger-stroke burger-stroke-top"
          d="M3 8.3C8 6.9 15 7.9 21 7.2l.1 2.1c-6 .7-12.6.2-18 1.1Z"
        />
        <path
          className="burger-stroke burger-stroke-bottom"
          d="M8 14.6c4-1.1 9-.3 13-.8l-.3 2.1c-4.3.6-8.6 0-12.8.9Z"
        />
      </svg>
    </button>
  );

  return (
    <header
      className={cn(
        variant === "solid" && "header-line bg-wall text-ink sticky top-0 z-20",
        variant === "stage" && "stage-header text-ink relative z-10 bg-transparent",
      )}
    >
      {/* Шире --page-max содержимое шапки не растягивается — края стоят
          над краями hero и сцены работы (globals.css, --page-max); над
          галереей — шире, по краям стены (--wall-max). */}
      <nav
        className={cn(
          "mx-auto px-[clamp(20px,5vw,64px)]",
          isWide ? "max-w-(--wall-max)" : "max-w-(--page-max)",
        )}
      >
        {/* Телефон и планшет: имя по центру, бургер справа — продолжение
            варианта «Б» с компьютера (заказчик, 9.10.2026). Слева пустая
            клетка шириной с бургер: без неё имя стояло бы по центру
            остатка строки, а не окна. Линию снизу рисует .header-line;
            вместо прежней рамки — лишний 1px снизу, высота та же 73px.

            На странице работы (stage) — тонкая полоса 48px с одним бургером,
            без имени и без линии (заказчик, 12.10.2026): имя и линия
            отвлекали от картины, а меню должно оставаться под рукой. */}
        {variant === "stage" ? (
          <div className="flex h-12 items-center justify-end lg:hidden">{burgerButton}</div>
        ) : (
          <div className="grid grid-cols-[40px_1fr_40px] items-center pt-4 pb-[17px] lg:hidden">
            <span aria-hidden="true" />
            <Link
              href={localePath(lang, "/")}
              className="font-heading text-center text-[20px] leading-tight no-underline"
            >
              {t.site.artist}
            </Link>
            {burgerButton}
          </div>
        )}

        {/* Компьютер: одна строка, три колонки 1fr · auto · 1fr — имя ровно
            по центру окна, какой бы ширины ни были края. Слева зал и язык,
            справа бургер; пункты меню и «Написать художнице» — в панели,
            которая выезжает справа (заказчик, 12.10.2026). Прежде шапка
            была в две строки, 144px: имя сверху, меню под ним. Одна строка
            — 86px (было 72px, заказчик 12.10.2026 попросил на 20% выше),
            и первый экран всё равно отдаёт картине больше прежнего. */}
        <div className="hidden h-[86px] grid-cols-[1fr_auto_1fr] items-center lg:grid">
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            {languageLink("lang-switch")}
          </div>
          <Link
            href={localePath(lang, "/")}
            className="font-heading text-[clamp(30px,2.6vw,38px)] leading-none no-underline"
          >
            {t.site.artist}
          </Link>
          <div className="flex justify-end">{burgerButton}</div>
        </div>
      </nav>

      {/*
        Меню. На телефоне — на весь экран, на компьютере — панель справа
        шириной от 528px, растёт с экраном; страница за ней затемняется (globals.css,
        .mobile-nav). Справа — потому что там бургер: панель выезжает
        оттуда, куда человек только что нажал.
      */}
      <dialog
        ref={menuRef}
        id="mobile-nav"
        aria-label={t.nav.menu}
        // -1: фокус на окно ставит openMenu, а в порядок Tab оно не входит.
        tabIndex={-1}
        onClose={() => setIsMenuOpen(false)}
        onCancel={handleCancel}
        // Клик по затемнённой странице рядом с панелью (компьютер) приходит
        // в само окно, а не в его содержимое: так и отличаем «мимо».
        onClick={(event) => event.target === event.currentTarget && dismissMenu()}
        className="mobile-nav"
      >
        <div className="flex min-h-full flex-col px-[clamp(20px,5vw,64px)] lg:px-10">
          {/* Верхняя строка повторяет шапку: имя по центру, крестик на месте
              бургера — меню читается как та же шапка, раскрытая вниз.
              Всё содержимое меню тоже по центру, как шапка. */}
          {/* На компьютере имени в панели нет: оно и так стоит в шапке
              рядом, а в узкой панели повторялось бы. Клетка остаётся,
              чтобы крестик стоял там же, где был бургер. */}
          <div className="border-divider grid grid-cols-[40px_1fr_40px] items-center border-b py-4 lg:h-[86px] lg:py-0">
            <span aria-hidden="true" />
            <Link
              href={localePath(lang, "/")}
              onClick={closeMenu}
              className="font-heading text-center text-[20px] leading-tight no-underline lg:invisible"
            >
              {t.site.artist}
            </Link>
            <button
              type="button"
              onClick={dismissMenu}
              aria-label={t.nav.closeMenu}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-current"
            >
              {/* Крестик из двух мазков — те же, что на кнопке меню, только
                  накрест: меню закрывается тем же жестом, каким открылось. */}
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                width="26"
                height="26"
                fill="currentColor"
              >
                <path d="M5.1 6.3c4.4 3.7 8.9 8 13.6 11.7l-1.3 1.6C12.6 15.9 8.3 11.6 3.9 7.8Z" />
                <path d="M18.6 5.6c-4.2 4.1-8.4 8.6-12.9 12.6l1.5 1.4c4.4-4 8.6-8.4 12.8-12.6Z" />
              </svg>
            </button>
          </div>

          {/* Пункты — крупно, шрифтом заголовков: на весь экран мелкий
              список выглядел бы потерянным. Появляются друг за другом
              (--i — номер пункта для задержки, globals.css). */}
          <div className="mt-[clamp(16px,6vh,48px)] flex flex-col items-center gap-1 lg:items-start">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={localePath(lang, item.href)}
                onClick={closeMenu}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                style={itemDelay(index)}
                className="mobile-nav-item nav-link font-heading py-1 text-[clamp(34px,10vw,46px)] leading-[1.15] lg:text-[40px]"
              >
                {isCurrent(item.href) && <BrushStroke className="nav-stroke" />}
                <span className="nav-link-label">{t.nav[item.key]}</span>
              </Link>
            ))}
          </div>

          <ButtonLink
            href={localePath(lang, navCta.href)}
            variant="primary"
            size="lg"
            className="mt-8 self-center lg:self-start"
            onClick={closeMenu}
          >
            {t.nav[navCta.key]}
          </ButtonLink>

          {/* mt-auto прижимает контакты и переключатели к низу экрана:
              пункты сверху, всё служебное — под большим пальцем. */}
          <div className="mt-auto pt-10 lg:pb-10">
            {contacts.length > 0 && (
              <>
                <p className="text-accent mt-0 mb-3 text-center text-[13px] font-semibold tracking-[0.1em] uppercase lg:text-left">
                  {t.nav.contacts}
                </p>
                <ul className="m-0 flex list-none flex-wrap justify-center gap-2.5 p-0 lg:justify-start">
                  {contacts.map((contact) => {
                    const name = contactName(contact.id, t.contacts);
                    return (
                      <li key={contact.id}>
                        <a
                          href={contact.href}
                          aria-label={`${name}: ${contact.value}`}
                          className="mobile-nav-contact"
                          {...(contact.isExternal
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          <ContactIcon id={contact.id} className="size-[18px]" />
                          {name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* На компьютере зал и язык и так в шапке, слева от имени. */}
            <div className="border-divider mt-6 flex items-center justify-center gap-5 border-t py-5 lg:hidden">
              <ThemeSwitch />
              {languageLink("lang-switch")}
            </div>
          </div>
        </div>
      </dialog>
    </header>
  );
}
