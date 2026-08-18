"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DemoArtwork } from "@/lib/demo-artworks";
import { site } from "@/lib/site";

const SLIDE_MS = 5000;

/**
 * Первый экран: работа на мольберте по центру, за ней медленно сменяются
 * размытые репродукции, поверх — затемнение и тёплое свечение.
 *
 * Мольберт собран из div-ов с градиентами (полка, две ноги, рама), а не
 * картинкой: масштабируется без потери резкости и перекрашивается токенами.
 */
export function Hero({ slides }: { slides: DemoArtwork[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;

    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, SLIDE_MS);

    return () => clearInterval(timer);
  }, [slides.length]);

  const easelWork = slides[active] ?? slides[0];

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-neutral-900">
      {/* Фон: размытые репродукции, сменяют друг друга плавным проявлением. */}
      <div className="washed absolute inset-0 blur-[2px]">
        {slides.map((work, i) => (
          <div
            key={work.id}
            className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
            style={{ opacity: i === active ? 1 : 0 }}
          >
            <ArtworkImage src={work.src} alt={work.title} sizes="100vw" priority={i === 0} />
          </div>
        ))}
      </div>

      {/* Три слоя поверх фона: общее затемнение, тёплое свечение по центру,
          притемнение к низу — чтобы текст читался поверх любой картины. */}
      <div className="pointer-events-none absolute inset-0 bg-[rgb(20_18_17/0.72)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_42%,rgb(214_127_72/0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgb(0_0_0/0.65),transparent_70%)]" />

      <Header variant="overlay" />

      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-9 px-[clamp(20px,5vw,64px)] pt-6 pb-14 text-center">
        <div>
          <span className="text-accent-300 mb-3.5 block text-[13px] font-semibold tracking-[0.1em] uppercase">
            {site.role}
          </span>
          <h1 className="m-0 text-[clamp(34px,5vw,58px)] leading-[1.08] text-neutral-100">
            {site.artist}
          </h1>
          <p className="font-heading text-accent-300 mt-4 mb-0 text-[clamp(17px,2.2vw,24px)] italic">
            {site.slogan}
          </p>
        </div>

        {/* Мольберт */}
        <div className="relative w-[min(78vw,420px)]">
          {/* полка */}
          <div className="absolute bottom-[-26px] left-1/2 h-3.5 w-[64%] -translate-x-1/2 -rotate-2 rounded-[3px] bg-[linear-gradient(180deg,rgb(90_64_42/0.9),rgb(60_42_28/0.95))]" />
          {/* ноги */}
          <div className="absolute bottom-[-40px] left-[8%] h-[100px] w-2.5 rotate-[8deg] rounded-[2px] bg-[linear-gradient(90deg,rgb(90_64_42/0.9),rgb(60_42_28/0.95))]" />
          <div className="absolute right-[8%] bottom-[-40px] h-[100px] w-2.5 -rotate-[8deg] rounded-[2px] bg-[linear-gradient(90deg,rgb(60_42_28/0.95),rgb(90_64_42/0.9))]" />

          {/* рама с холстом */}
          <div className="relative rounded-md bg-[linear-gradient(160deg,var(--color-frame-light),var(--color-frame-dark))] p-3.5 shadow-[0_40px_90px_rgb(0_0_0/0.65),0_0_70px_rgb(214_127_72/0.2)]">
            <div className="washed relative aspect-4/5 overflow-hidden rounded-[2px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]">
              <ArtworkImage
                src={easelWork?.src}
                alt={easelWork?.title ?? "Работа художницы"}
                sizes="(max-width: 640px) 78vw, 420px"
                priority
              />
            </div>
          </div>
        </div>

        {/* Переключатели слайдов */}
        {slides.length > 1 && (
          <div className="mt-2 flex gap-2">
            {slides.map((work, i) => (
              <button
                key={work.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Показать работу «${work.title}»`}
                aria-pressed={i === active}
                className={cn(
                  "size-[9px] cursor-pointer rounded-full border-0 transition-colors",
                  i === active ? "bg-accent-300" : "bg-neutral-100/35",
                )}
              />
            ))}
          </div>
        )}

        <p className="m-0 max-w-[52ch] text-base leading-relaxed text-neutral-100/90">
          Пишет маслом и акрилом с 2020 года. Взявшись за кисть в 55 лет, она прошла путь от первых
          этюдов до признания — сегодня её работы можно увидеть в галереях далеко за пределами
          республики.
        </p>

        <div className="flex flex-wrap justify-center gap-3.5">
          <ButtonLink href="/gallery" variant="primary" size="lg">
            Смотреть галерею
          </ButtonLink>
          <ButtonLink href="/about" variant="onDark" size="lg">
            О художнице
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
