"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { navCta, navItems, site } from "@/lib/site";

/**
 * Шапка сайта в двух вариантах, как в макете:
 *
 * - `overlay` — на главной: прозрачная, лежит поверх hero-изображения,
 *   светлый текст, не липкая (уезжает вместе с hero);
 * - `solid` — на внутренних страницах: тёмная плашка, липнет к верху окна.
 *
 * Ниже 768px пункты убираются под кнопку-бургер. В макете навигация просто
 * переносилась по словам и занимала на телефоне три строки (148px) — почти
 * четверть первого экрана; выпадающее меню решает это без потери пунктов.
 */
export function Header({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOverlay = variant === "overlay";

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        isOverlay
          ? "relative z-10 bg-transparent text-neutral-100"
          : "sticky top-0 z-20 bg-neutral-900 text-neutral-100",
      )}
    >
      <nav className="flex items-center gap-x-[17.6px] gap-y-3 px-[clamp(20px,5vw,64px)] py-5">
        <Link href="/" className="font-heading mr-auto text-[18px] no-underline">
          {site.artist}
        </Link>

        {/* Десктоп: пункты в строку */}
        <div className="hidden items-center gap-x-[17.6px] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={cn(
                "hover:text-accent-300 text-sm no-underline transition-colors",
                isCurrent(item.href) && "text-accent-300",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink href={navCta.href} variant="primary">
            {navCta.label}
          </ButtonLink>
        </div>

        {/* Мобильный: кнопка-бургер */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          className="flex size-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full border-0 bg-transparent md:hidden"
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
          className="flex flex-col gap-1 bg-neutral-900 px-[clamp(20px,5vw,64px)] pt-2 pb-6 md:hidden"
        >
          {/* Закрываем меню прямо по клику, а не эффектом на смену пути:
              эффект, дёргающий setState, — лишний ре-рендер и жалоба
              react-hooks/set-state-in-effect. */}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={cn(
                "hover:text-accent-300 py-2 text-base no-underline transition-colors",
                isCurrent(item.href) && "text-accent-300",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink
            href={navCta.href}
            variant="primary"
            className="mt-3 self-start"
            onClick={() => setOpen(false)}
          >
            {navCta.label}
          </ButtonLink>
        </div>
      )}
    </header>
  );
}
