"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import { PictureLamp } from "@/components/gallery/PictureLamp";
import { site } from "@/lib/site";

/** Пауза между появлением картины в темноте и щелчком выключателя. */
const SWITCH_DELAY_MS = 700;

/** Сколько ждать, пока браузер раскодирует фотографию, прежде чем включать свет. */
const DECODE_WAIT_MS = 1500;

/**
 * Картина в тёмной комнате под лампой-подсветкой.
 *
 * Клиентский компонент по одной причине: раму нужно построить по форме
 * холста, а размеров фотографий в базе нет. Форма берётся у загруженной
 * картинки (naturalWidth / naturalHeight) и уходит в CSS переменной --ar —
 * всё остальное, от толщины рамы до размаха света, CSS считает от неё
 * (globals.css, блок «комната с подсветкой»).
 *
 * Отсюда и сценарий: пока фотография грузится, в комнате темно; загрузилась —
 * проступает рама, и через мгновение щёлкает выключатель. Выключатель
 * остаётся посетителю — кнопкой в углу.
 */
export function ArtworkRoom({
  src,
  title,
  details,
  backHref,
}: {
  src: string;
  title: string;
  /** Строка под названием на табличке: техника, размер, год — что известно. */
  details?: string;
  backHref: string;
}) {
  const [aspect, setAspect] = useState<number | null>(null);
  const [isLightOn, setIsLightOn] = useState(false);

  const isReady = aspect !== null;

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => setIsLightOn(true), SWITCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isReady]);

  function readAspect(image: HTMLImageElement | null) {
    if (image === null || !image.complete || image.naturalWidth === 0) return;
    const ratio = image.naturalWidth / image.naturalHeight;

    // Загружена — ещё не значит готова к показу: раскодирует браузер
    // отдельно, и без ожидания свет загорался над чёрным холстом, а картина
    // проступала на секунду позже. decode() ждёт именно этого.
    //
    // Но ждём не дольше DECODE_WAIT_MS. В скрытой вкладке decode() не
    // завершается, пока вкладку не откроют, а если какой-то браузер не
    // завершит его вовсе, комната осталась бы тёмной навсегда, с неактивным
    // выключателем. Картина на мгновение позже лучше вечной темноты.
    const show = () => setAspect(ratio);
    const timeout = new Promise((resolve) => setTimeout(resolve, DECODE_WAIT_MS));
    Promise.race([image.decode(), timeout]).then(show, show);
  }

  const style: CSSProperties & { "--ar": number } = { "--ar": aspect ?? 1 };

  return (
    <section
      className="room"
      style={style}
      data-ready={isReady}
      data-light={isLightOn ? "on" : "off"}
      aria-label={`«${title}» в интерьере`}
    >
      <div className="room-bar flex items-center justify-between gap-4 px-[clamp(20px,5vw,64px)] pt-5 md:pt-7">
        <Link
          href={backHref}
          className="text-[15px] text-[var(--room-ink)] no-underline opacity-80 hover:underline hover:opacity-100"
        >
          ← К работе
        </Link>

        {/*
          Выключатель — кнопка с aria-pressed: скринридер зачитает
          «Свет, нажата». Лампочка-индикатор дублирует состояние для глаза,
          подпись — для тех, кто не различает свечение.
        */}
        <button
          type="button"
          aria-pressed={isLightOn}
          disabled={!isReady}
          onClick={() => setIsLightOn((value) => !value)}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-[var(--room-ink)]/25 px-4 text-[15px] text-[var(--room-ink)] transition-colors hover:border-[var(--room-ink)]/50 disabled:opacity-40"
        >
          <span
            aria-hidden="true"
            className={
              isLightOn
                ? "size-2.5 rounded-full bg-[var(--room-light-warm)] shadow-[0_0_10px_2px_var(--room-light-warm)]"
                : "size-2.5 rounded-full border border-[var(--room-ink)]/50"
            }
          />
          {isLightOn ? "Выключить свет" : "Включить свет"}
        </button>
      </div>

      <div className="room-scene">
        <div className="room-piece">
          <div className="room-frame">
            <span aria-hidden="true" className="room-rail room-rail-top" />
            <span aria-hidden="true" className="room-rail room-rail-right" />
            <span aria-hidden="true" className="room-rail room-rail-bottom" />
            <span aria-hidden="true" className="room-rail room-rail-left" />

            <div className="room-canvas">
              <Image
                src={src}
                alt={title}
                fill
                sizes="(max-width: 767px) 74vw, 56vw"
                className="object-cover"
                onLoad={(event) => readAspect(event.currentTarget)}
                // Фотография из кэша успевает загрузиться раньше, чем страница
                // оживёт, и событие загрузки проходит мимо — комната осталась бы
                // тёмной навсегда. Поэтому готовность проверяется и сразу, как
                // только элемент появился. Поймано в браузере.
                ref={readAspect}
                priority
              />
            </div>
          </div>

          <div className="room-light" aria-hidden="true" />
          <div className="room-light-above" aria-hidden="true" />

          <div className="room-lamp" aria-hidden="true">
            <PictureLamp />
          </div>

          <div className="room-glow" aria-hidden="true" />
          <div className="room-shine" aria-hidden="true" />

          <div className="room-label">
            <p className="font-heading m-0 text-[17px] leading-snug">{title}</p>
            <p className="mt-1.5 mb-0 text-[13px]">{site.artist}</p>
            {details && <p className="mt-0.5 mb-0 text-[12px] opacity-80">{details}</p>}
          </div>
        </div>
      </div>

      <div className="room-dark" aria-hidden="true" />
    </section>
  );
}
