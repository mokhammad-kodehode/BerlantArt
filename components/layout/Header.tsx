"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrushStroke } from "@/components/ui/BrushStroke";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { cn } from "@/lib/cn";
import { localePath, splitLocale } from "@/lib/i18n/config";
import { useDictionary } from "@/lib/i18n/client";
import { navCta, navItems } from "@/lib/site";

/**
 * Шапка сайта в двух вариантах:
 *
 * - `stage` — на главной и на странице работы: прозрачная, не липкая,
 *   текст берётся из темы — в белом зале светлые надписи исчезли бы;
 * - `solid` — на остальных страницах: плашка цвета стены, липнет к верху.
 *
 * Ниже 1024px пункты убираются под кнопку-бургер. В макете навигация просто
 * переносилась по словам и занимала на телефоне три строки (148px) — почти
 * четверть первого экрана; выпадающее меню решает это без потери пунктов.
 * Граница была 768px, но с переключателем языка и английскими подписями
 * строка меню на 768px вылезала за экран на 14–29px и обрезала кнопку.
 *
 * Язык — по адресу страницы (`/en/…` — английский). Переключатель
 * ведёт на ту же страницу другого языка, а не на главную: человек,
 * открывший работу по ссылке, хочет прочитать про неё же.
 */
export function Header({ variant = "solid" }: { variant?: "solid" | "stage" }) {
  const { lang, path } = splitLocale(usePathname());
  const t = useDictionary();
  const [open, setOpen] = useState(false);

  const isCurrent = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const otherLang = lang === "ru" ? "en" : "ru";

  // Короткая подпись (EN / RU), чтобы не теснить строку меню на 768px;
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
      onClick={() => setOpen(false)}
    >
      {otherLang.toUpperCase()}
    </Link>
  );

  return (
    <header
      className={cn(
        variant === "solid" && "bg-wall text-ink sticky top-0 z-20",
        variant === "stage" && "text-ink relative z-10 bg-transparent",
      )}
    >
      <nav className="flex items-center gap-x-[17.6px] gap-y-3 px-[clamp(20px,5vw,64px)] py-5">
        <Link
          href={localePath(lang, "/")}
          className="font-heading mr-auto text-[18px] no-underline"
        >
          {t.site.artist}
        </Link>

        {/* Десктоп: пункты в строку */}
        <div className="hidden items-center gap-x-[17.6px] lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={localePath(lang, item.href)}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className="nav-link text-sm"
            >
              {isCurrent(item.href) && <BrushStroke className="nav-stroke" />}
              <span className="nav-link-label">{t.nav[item.key]}</span>
            </Link>
          ))}
          {languageLink("lang-switch")}
          <ThemeSwitch className="mx-1" />
          <ButtonLink href={localePath(lang, navCta.href)} variant="primary">
            {t.nav[navCta.key]}
          </ButtonLink>
        </div>

        {/* Мобильный: кнопка-бургер */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
          className="flex size-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full border-0 bg-transparent lg:hidden"
        >
          <span
            className={cn(
              "block h-[1.5px] w-5 bg-current transition-transform",
              open && "translate-y-[6.5px] rotate-45",
            )}
          />
          <span
            className={cn("block h-[1.5px] w-5 bg-current transition-opacity", open && "opacity-0")}
          />
          <span
            className={cn(
              "block h-[1.5px] w-5 bg-current transition-transform",
              open && "-translate-y-[6.5px] -rotate-45",
            )}
          />
        </button>
      </nav>

      {/* Выпадающая панель. Всегда на тёмной плашке — на главной она
          раскрывается поверх фотографии, и прозрачный фон был бы нечитаем. */}
      {open && (
        <div
          id="mobile-nav"
          className="bg-wall flex flex-col gap-1 px-[clamp(20px,5vw,64px)] pt-2 pb-6 lg:hidden"
        >
          {/* Закрываем меню прямо по клику, а не эффектом на смену пути:
              эффект, дёргающий setState, — лишний ре-рендер и жалоба
              react-hooks/set-state-in-effect. */}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={localePath(lang, item.href)}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              // self-start — чтобы мазок под текущим пунктом был длиной
              // в слово, а не во всю ширину выпадающей панели.
              className="nav-link my-2 self-start text-base"
            >
              {isCurrent(item.href) && <BrushStroke className="nav-stroke" />}
              <span className="nav-link-label">{t.nav[item.key]}</span>
            </Link>
          ))}
          <ButtonLink
            href={localePath(lang, navCta.href)}
            variant="primary"
            className="mt-3 self-start"
            onClick={() => setOpen(false)}
          >
            {t.nav[navCta.key]}
          </ButtonLink>

          <div className="border-divider mt-5 flex items-center gap-5 border-t pt-4">
            <ThemeSwitch />
            {languageLink("lang-switch")}
          </div>
        </div>
      )}
    </header>
  );
}
