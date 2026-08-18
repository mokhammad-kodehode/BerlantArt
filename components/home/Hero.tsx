"use client";

import Image from "next/image";
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

      {/* gap-7, а не gap-9: фотография мольберта выше прежней CSS-рамы, и с
          прежними отступами кнопки уезжали за первый экран на ноутбуке. */}
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-7 px-[clamp(20px,5vw,64px)] pt-6 pb-12 text-center">
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

        {/* Мольберт: настоящая фотография деревянного мольберта с пустым
            холстом, поверх которого встаёт работа. */}
        <div className="relative aspect-800/1325 h-[clamp(280px,42vh,500px)] drop-shadow-[0_40px_70px_rgb(0_0_0/0.55)]">
          <Image
            src="/ui/easel.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 60vw, 340px"
            className="object-contain"
          />

          {/* Работа лежит ровно в границах холста. Проценты измерены по
              пикселям самого файла, а не подобраны на глаз — поэтому
              попадают точно и не поедут при смене размера.

              Края холста на фотографии слегка неровные, поэтому взят полный
              размах светлых пикселей: иначе по бокам проглядывала белая
              полоска незакрашенного холста. Низ — исключение, там замер
              цепляет светлую кромку полки, и граница задана по холсту. */}
          <div
            className="washed absolute overflow-hidden shadow-[inset_0_0_18px_rgb(0_0_0/0.28)]"
            style={{ left: "6.25%", top: "9.13%", width: "87.38%", height: "44.15%" }}
          >
            <ArtworkImage
              src={easelWork?.src}
              alt={easelWork?.title ?? "Работа художницы"}
              sizes="(max-width: 640px) 52vw, 300px"
              priority
            />
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
