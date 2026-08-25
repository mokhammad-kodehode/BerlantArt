"use client";

import { useEffect, useRef } from "react";

/**
 * Видео, которым управляет прокрутка: картина «рисуется» по мере того, как
 * посетитель листает вниз. Само по себе видео не играет — его позиция
 * жёстко привязана к положению страницы.
 *
 * Как устроено: внешний блок намеренно высокий (три экрана), внутри него
 * липкий контейнер в один экран. Пока страница проходит эти три экрана,
 * липкий контейнер стоит на месте, а мы пересчитываем долю пройденного пути
 * и ставим видео на соответствующую секунду.
 *
 * Высота внешнего блока задаёт «скорость»: чем он выше, тем медленнее
 * раскрывается картина за один и тот же ход колеса.
 */

/** Сколько экранов прокрутки уходит на полный проигрыш ролика. */
const SCROLL_SCREENS = 3;

export function ScrollVideo() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;

    let frame = 0;

    const update = () => {
      frame = 0;

      // До загрузки метаданных длительность равна NaN — перематывать нечего.
      const { duration } = video;
      if (!Number.isFinite(duration) || duration === 0) return;

      const rect = wrapper.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;

      // rect.top идёт от 0 (блок только пришёл сверху) до -scrollable
      // (блок полностью пройден). Отсюда доля пути от 0 до 1.
      const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);

      video.currentTime = progress * duration;
    };

    // Прокрутка приходит чаще, чем браузер успевает перерисовать кадр,
    // поэтому пересчёт откладывается до ближайшей отрисовки.
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    video.addEventListener("loadedmetadata", update);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      video.removeEventListener("loadedmetadata", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ height: `${SCROLL_SCREENS * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-neutral-900">
        {/*
          Ни autoPlay, ни loop: позицию задаёт прокрутка, а не проигрывание.
          muted и playsInline всё равно нужны — без них мобильные браузеры
          не дают перематывать видео без действия пользователя.
        */}
        <video
          ref={videoRef}
          src="/video/painting-reveal.mp4"
          muted
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgb(0_0_0/0.55),transparent_70%)]" />

        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
          <span className="text-[13px] tracking-[0.08em] text-neutral-100/70 uppercase">
            Листайте — картина рождается
          </span>
        </div>
      </div>
    </div>
  );
}
