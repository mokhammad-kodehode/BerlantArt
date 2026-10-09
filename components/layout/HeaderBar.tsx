"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";

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
  function openMenu(): void {
    const menu = menuRef.current;
    if (!menu) return;
    menu.showModal();
    menu.focus();
    setIsMenuOpen(true);
  }

  function closeMenu(): void {
    menuRef.current?.close();
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
        {/* Телефон и планшет: имя и бургер в одну строку. */}
        <div className="flex items-center py-5 lg:hidden">
          <Link
            href={localePath(lang, "/")}
            className="font-heading mr-auto text-[18px] no-underline"
          >
            {t.site.artist}
          </Link>
          <button
            type="button"
            onClick={openMenu}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label={t.nav.openMenu}
            className="flex size-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full border-0 bg-transparent"
          >
            <span className="block h-[1.5px] w-5 bg-current" />
            <span className="block h-[1.5px] w-5 bg-current" />
            <span className="block h-[1.5px] w-5 bg-current" />
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
        className="mobile-nav"
      >
        <div className="flex min-h-full flex-col px-[clamp(20px,5vw,64px)]">
          {/* Верхняя строка повторяет шапку: имя слева, крестик на месте
              бургера — меню читается как та же шапка, раскрытая вниз. */}
          <div className="flex items-center py-5">
            <Link
              href={localePath(lang, "/")}
              onClick={closeMenu}
              className="font-heading mr-auto text-[18px] no-underline"
            >
              {t.site.artist}
            </Link>
            <button
              type="button"
              onClick={closeMenu}
              aria-label={t.nav.closeMenu}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-current"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              >
                <path d="M5 5l14 14M19 5 5 19" />
              </svg>
            </button>
          </div>

          {/* Пункты — крупно, шрифтом заголовков: на весь экран мелкий
              список выглядел бы потерянным. Появляются друг за другом
              (--i — номер пункта для задержки, globals.css). */}
          <div className="mt-[clamp(8px,5vh,40px)] flex flex-col items-start gap-1">
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
            className="mt-8 self-start"
            onClick={closeMenu}
          >
            {t.nav[navCta.key]}
          </ButtonLink>

          {/* mt-auto прижимает контакты и переключатели к низу экрана:
              пункты сверху, всё служебное — под большим пальцем. */}
          <div className="mt-auto pt-10">
            {contacts.length > 0 && (
              <>
                <p className="text-accent mt-0 mb-3 text-[13px] font-semibold tracking-[0.1em] uppercase">
                  {t.nav.contacts}
                </p>
                <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
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

            <div className="border-divider mt-6 flex items-center gap-5 border-t py-5">
              <ThemeSwitch />
              {languageLink("lang-switch")}
            </div>
          </div>
        </div>
      </dialog>
    </header>
  );
}
