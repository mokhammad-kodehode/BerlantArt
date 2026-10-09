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
 * Два варианта:
 *
 * - `stage` — на главной и на странице работы: прозрачная, не липкая,
 *   текст берётся из темы — в белом зале светлые надписи исчезли бы;
 * - `solid` — на остальных страницах: плашка цвета стены, липнет к верху.
 *
 * Ниже 1024px пункты убираются под кнопку-бургер. В макете навигация просто
 * переносилась по словам и занимала на телефоне три строки (148px) — почти
 * четверть первого экрана. Граница была 768px, но с переключателем языка
 * и английскими подписями строка меню на 768px вылезала за экран.
 *
 * Меню бургера — на весь экран (заказчик, 8.10.2026): прежде оно
 * выпадало плашкой на полэкрана, и под ним торчала страница. Теперь
 * в нём крупные пункты, кнопка «Написать художнице», все способы связи
 * и переключатели зала и языка.
 *
 * Язык — по адресу страницы (`/en/…` — английский). Переключатель
 * ведёт на ту же страницу другого языка, а не на главную: человек,
 * открывший работу по ссылке, хочет прочитать про неё же.
 */
export function HeaderBar({
  variant = "solid",
  contacts = [],
}: {
  variant?: "solid" | "stage";
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

  return (
    /*
      На компьютере шапка в две строки (вариант «Б», заказчик 9.10.2026):
      сверху имя по центру, как название на обложке, под тонкой линией —
      меню: зал и язык слева, пункты по центру, «Написать художнице»
      справа. Пункты крупнее прежнего — 17px вместо 14.

      Липкая шапка сдвинута вверх на высоту строки с именем (lg:-top-[72px]):
      при прокрутке имя уезжает, у верха остаётся только меню. Две строки
      у верха экрана — около 140px, многовато для страницы, которую читают.
      72px — та же высота, что задана строке с именем (lg:h-[72px]):
      разойдутся — у верха останется полоска имени или срежется меню.
    */
    <header
      className={cn(
        variant === "solid" && "bg-wall text-ink sticky top-0 z-20 lg:-top-[72px]",
        variant === "stage" && "text-ink relative z-10 bg-transparent",
      )}
    >
      {/* Компьютер, строка 1: имя. */}
      <div className="hidden h-[72px] items-end justify-center px-[clamp(20px,5vw,64px)] pb-3 lg:flex">
        <Link
          href={localePath(lang, "/")}
          className="font-heading text-[clamp(26px,2.3vw,32px)] leading-none no-underline"
        >
          {t.site.artist}
        </Link>
      </div>

      <nav className="px-[clamp(20px,5vw,64px)]">
        {/* Телефон и планшет: имя по центру, бургер справа — продолжение
            варианта «Б» с компьютера (заказчик, 9.10.2026). Слева пустая
            клетка шириной с бургер: без неё имя стояло бы по центру
            остатка строки, а не окна. Линия снизу — та же, что на
            компьютере между именем и меню. */}
        <div className="border-divider grid grid-cols-[40px_1fr_40px] items-center border-b py-4 lg:hidden">
          <span aria-hidden="true" />
          <Link
            href={localePath(lang, "/")}
            className="font-heading text-center text-[20px] leading-tight no-underline"
          >
            {t.site.artist}
          </Link>
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
        </div>

        {/* Компьютер, строка 2: три колонки 1fr · auto · 1fr — пункты стоят
            ровно по центру окна, как имя над ними, какой бы ширины ни были
            края. */}
        <div className="border-divider hidden grid-cols-[1fr_auto_1fr] items-center border-t py-3.5 lg:grid">
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            {languageLink("lang-switch")}
          </div>
          <div className="flex items-center gap-x-[26px]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={localePath(lang, item.href)}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className="nav-link text-[17px]"
              >
                {isCurrent(item.href) && <BrushStroke className="nav-stroke" />}
                <span className="nav-link-label">{t.nav[item.key]}</span>
              </Link>
            ))}
          </div>
          <div className="flex justify-end">
            <ButtonLink href={localePath(lang, navCta.href)} variant="primary">
              {t.nav[navCta.key]}
            </ButtonLink>
          </div>
        </div>
      </nav>

      {/*
        Меню на весь экран. Без lg:hidden намеренно: если телефон повернуть
        и окно станет шире 1024px, открытое меню не должно стать невидимым —
        страница под ним осталась бы неактивной, и выйти было бы нельзя.
        Открыть его на широком экране всё равно нечем: бургер там скрыт.
      */}
      <dialog
        ref={menuRef}
        id="mobile-nav"
        aria-label={t.nav.menu}
        // -1: фокус на окно ставит openMenu, а в порядок Tab оно не входит.
        tabIndex={-1}
        onClose={() => setIsMenuOpen(false)}
        onCancel={handleCancel}
        className="mobile-nav"
      >
        <div className="flex min-h-full flex-col px-[clamp(20px,5vw,64px)]">
          {/* Верхняя строка повторяет шапку: имя по центру, крестик на месте
              бургера — меню читается как та же шапка, раскрытая вниз.
              Всё содержимое меню тоже по центру, как шапка. */}
          <div className="border-divider grid grid-cols-[40px_1fr_40px] items-center border-b py-4">
            <span aria-hidden="true" />
            <Link
              href={localePath(lang, "/")}
              onClick={closeMenu}
              className="font-heading text-center text-[20px] leading-tight no-underline"
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
          <div className="mt-[clamp(16px,6vh,48px)] flex flex-col items-center gap-1">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={localePath(lang, item.href)}
                onClick={closeMenu}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                style={itemDelay(index)}
                className="mobile-nav-item nav-link font-heading py-1 text-[clamp(34px,10vw,46px)] leading-[1.15]"
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
            className="mt-8 self-center"
            onClick={closeMenu}
          >
            {t.nav[navCta.key]}
          </ButtonLink>

          {/* mt-auto прижимает контакты и переключатели к низу экрана:
              пункты сверху, всё служебное — под большим пальцем. */}
          <div className="mt-auto pt-10">
            {contacts.length > 0 && (
              <>
                <p className="text-accent mt-0 mb-3 text-center text-[13px] font-semibold tracking-[0.1em] uppercase">
                  {t.nav.contacts}
                </p>
                <ul className="m-0 flex list-none flex-wrap justify-center gap-2.5 p-0">
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

            <div className="border-divider mt-6 flex items-center justify-center gap-5 border-t py-5">
              <ThemeSwitch />
              {languageLink("lang-switch")}
            </div>
          </div>
        </div>
      </dialog>
    </header>
  );
}
