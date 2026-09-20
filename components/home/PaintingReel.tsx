"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Скорость видео: чуть медленнее обычной, по просьбе заказчика.
 * Было в 1.5 раза медленнее (около 19.5 секунд при ролике в 13),
 * ускорено до 1.25. Из 13 секунд ролика показываются 11 (см. START_AT),
 * с замедлением — около 13.8 секунды на круг. Захочешь ещё быстрее —
 * значение можно поднять вплоть до 1 (обычная скорость).
 * Замедление задаётся свойством playbackRate, файл не перекодируется.
 */
const PLAYBACK_RATE = 1 / 1.25;

/**
 * С какой секунды играет ролик: первые две срезаны по просьбе заказчика.
 * Срезаны не в файле, а при показе — ffmpeg в окружении нет. Обрезать
 * сам файл было бы чище: ушли бы лишние килобайты и немая звуковая дорожка.
 */
const START_AT = 2;

const WORDMARK = "Berlant Art";

/**
 * Доли прокрутки секции: сначала только видео, затем проявляется надпись,
 * затем она держится целиком, пока секция не отпустит экран.
 */
const REVEAL_START = 0.2;
const REVEAL_END = 0.7;

/**
 * Последняя секция главной, перед подвалом: видео на весь экран, по кругу.
 *
 * Секция втрое выше окна, а видео внутри неё прилипает (sticky) — поэтому
 * при прокрутке экран стоит на месте, а поверх видео по буквам проявляется
 * «Berlant Art». Когда надпись проявилась, секция кончается и страница
 * листается дальше. Так по просьбе заказчика; прежде после ролика шли
 * слайды с работами — убраны, работы есть в стене ниже.
 *
 * Прогресс прокрутки пишется в CSS-переменную прямо на элементе, без
 * useState: иначе React перерисовывал бы компонент на каждый кадр прокрутки.
 * CSS-анимации по прокрутке (animation-timeline) были бы короче, но Firefox
 * их пока не поддерживает, и надпись там не появилась бы вовсе.
 */
export function PaintingReel() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ролик весит 6.2 МБ и лежит в самом конце страницы. Пока секцию не видно,
  // он не качается и не крутится; запас в 200px — чтобы первый кадр успел
  // появиться к подходу, а не после. play() отклоняется, если браузер
  // запретил автовоспроизведение; глушим, иначе в консоли копятся ошибки.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        video.playbackRate = PLAYBACK_RATE;
        void video.play().catch(() => {});
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Прогресс надписи от прокрутки. Пересчёт не чаще раза за кадр.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    const update = (): void => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? -rect.top / scrollable : 0;
      const reveal = (progress - REVEAL_START) / (REVEAL_END - REVEAL_START);
      section.style.setProperty("--reveal", String(Math.min(1, Math.max(0, reveal))));
    };
    const onScroll = (): void => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function handleEnded(): void {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = START_AT;
    void video.play().catch(() => {});
  }

  const letters = [...WORDMARK];
  // Доля позиции буквы в слове: по ней CSS сдвигает начало её появления.
  const letterStyle = (i: number): CSSProperties & { "--i": number } => ({
    "--i": i / letters.length,
  });

  return (
    <section ref={sectionRef} className="reel relative h-[300svh] bg-neutral-900">
      {/* overflow-hidden здесь, а не на секции: на родителе он ломает sticky. */}
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/*
          muted и playsInline обязательны: без них браузеры блокируют
          автозапуск, и на телефоне видео открылось бы на весь экран.
        */}
        <video
          ref={videoRef}
          // #t= — фрагмент медиа: браузер начнёт сразу со START_AT.
          src={`/video/painting-reveal.mp4#t=${START_AT}`}
          muted
          playsInline
          preload="none"
          aria-hidden
          // Вместо loop: он вернул бы ролик на нулевую секунду, а не на START_AT.
          onEnded={handleEnded}
          className="absolute inset-0 size-full object-cover"
        />

        {/* Затемнение нарастает вместе с надписью — чтобы она читалась
            на любом кадре, а пока надписи нет, видео не гасилось зря. */}
        <div className="reel-shade pointer-events-none absolute inset-0 bg-neutral-900" />

        <div className="absolute inset-0 flex items-center justify-center px-[clamp(20px,5vw,64px)]">
          {/* Скринридер читает слово целиком, а не по буквам. */}
          <p
            lang="en"
            className="font-heading m-0 text-center text-[clamp(56px,13vw,220px)] leading-none whitespace-nowrap text-neutral-100"
          >
            <span className="sr-only">{WORDMARK}</span>
            <span aria-hidden>
              {letters.map((letter, i) => (
                <span key={i} className="reel-letter inline-block" style={letterStyle(i)}>
                  {/* Обычный пробел в inline-block схлопывается в ноль ширины. */}
                  {letter === " " ? "\u00a0" : letter}
                </span>
              ))}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
