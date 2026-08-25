"use client";

import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { DemoArtwork } from "@/lib/demo-artworks";
import { site } from "@/lib/site";

/** Сколько держится один слайд с картиной. */
const SLIDE_MS = 3500;

/**
 * Скорость видео: в полтора раза медленнее обычной, по просьбе заказчика.
 * Ролик длится 13 секунд, с этим замедлением — около 19.5.
 * Замедление задаётся свойством playbackRate, файл не перекодируется.
 */
const PLAYBACK_RATE = 1 / 1.5;

type Phase = "video" | "slides";

/**
 * Первый экран: во всю ширину идёт видео, после его окончания — слайды
 * с работами художницы, затем видео начинается заново. Цикл бесконечный.
 *
 * Мольберта с холстом здесь больше нет: видео заняло его место как главный
 * визуальный акцент, и две крупные картины на одном экране спорили бы
 * друг с другом.
 *
 * Видео и слайды лежат обоими слоями одновременно, переключается только
 * прозрачность — так переход получается плавным, без чёрного провала между
 * фазами.
 */
export function Hero({ slides }: { slides: DemoArtwork[] }) {
  const [phase, setPhase] = useState<Phase>("video");
  const [slideIndex, setSlideIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Листаем слайды, после последнего возвращаемся к видео.
  useEffect(() => {
    if (phase !== "slides") return;

    const timer = setTimeout(() => {
      if (slideIndex < slides.length - 1) {
        setSlideIndex(slideIndex + 1);
      } else {
        setSlideIndex(0);
        setPhase("video");
      }
    }, SLIDE_MS);

    return () => clearTimeout(timer);
  }, [phase, slideIndex, slides.length]);

  // Возврат к видео — перематываем на начало и запускаем заново.
  // play() возвращает промис и отклоняется, если браузер запретил
  // автовоспроизведение; глушим, иначе в консоли копятся ошибки.
  useEffect(() => {
    if (phase !== "video") return;

    const video = videoRef.current;
    if (!video) return;

    // Эффект срабатывает и при первой отрисовке (фаза стартует с "video"),
    // поэтому скорость задаётся здесь же — отдельный эффект не нужен.
    video.playbackRate = PLAYBACK_RATE;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [phase]);

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-neutral-900">
      <div className="absolute inset-0">
        {/*
          muted и playsInline обязательны: без них браузеры блокируют
          автозапуск, и на телефоне видео открылось бы на весь экран.
          У файла есть звуковая дорожка, но фоновому видео звук не нужен.
        */}
        <video
          ref={videoRef}
          src="/video/painting-reveal.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          onEnded={() => setPhase("slides")}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-1000",
            phase === "video" ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Слайды с работами. Фильтр washed приглушает репродукции, чтобы
            они не спорили по насыщенности с охрой интерфейса. */}
        {slides.map((work, i) => (
          <div
            key={work.id}
            className={cn(
              "washed absolute inset-0 transition-opacity duration-1000",
              phase === "slides" && i === slideIndex ? "opacity-100" : "opacity-0",
            )}
          >
            <ArtworkImage src={work.src} alt={work.title} sizes="100vw" />
          </div>
        ))}
      </div>

      {/* Затемнение и тёплое свечение поверх фона — чтобы текст читался
          и на видео, и на любой картине. Здесь 55%, а не 72% как раньше:
          под неподвижной картиной можно было темнить сильнее, а видео
          при такой заливке превращалось в тёмное пятно. */}
      <div className="pointer-events-none absolute inset-0 bg-[rgb(20_18_17/0.55)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_42%,rgb(214_127_72/0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgb(0_0_0/0.7),transparent_70%)]" />

      <Header variant="overlay" />

      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-7 px-[clamp(20px,5vw,64px)] pt-6 pb-14 text-center">
        <div>
          <span className="text-accent-300 mb-3.5 block text-[13px] font-semibold tracking-[0.1em] uppercase">
            {site.role}
          </span>
          <h1 className="m-0 text-[clamp(38px,6vw,72px)] leading-[1.06] text-neutral-100">
            {site.artist}
          </h1>
          <p className="font-heading text-accent-300 mt-5 mb-0 text-[clamp(19px,2.6vw,30px)] italic">
            {site.slogan}
          </p>
        </div>

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
