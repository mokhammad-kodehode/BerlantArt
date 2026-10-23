"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ArQuickLookLink, useArCamera, type ArCameraModel } from "@/components/gallery/ArCamera";
import { ArGuide, hasSeenArGuide, rememberArGuide } from "@/components/gallery/ArGuide";
import { FramePicker } from "@/components/gallery/FramePicker";
import { FramedPainting } from "@/components/gallery/FramedPainting";
import { Button } from "@/components/ui/Button";
import { arFileUrl, roomPageUrl } from "@/lib/ar-links";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";
import {
  canvasCmText,
  fittingMessage,
  frameQuery,
  framedCanvas,
  parseFrameChoice,
  type CanvasCm,
  type FrameChoice,
} from "@/lib/room-options";

/** Сколько держится подсказка под кнопками. */
const hintDuration = 6000;

/** Картина примерочной: всё из общего списка, холст — обязательно. */
export type FittingWork = Pick<ArtworkFeedItem, "id" | "title" | "arVersion"> & {
  src: string;
  alt: string;
  canvas: CanvasCm;
};

// Адрес меняет только сама примерочная (replaceState), события об этом
// нет — подписываться не на что: адрес читается при отрисовке.
const noSubscribe = () => () => {};
const readSearch = () => window.location.search;
const noSearch = () => "";

/**
 * Примерочная, экран «Картина и рама» (TICKETS-primerka.md, П-1): картина
 * в выбранной раме, ряд моделей и цветов, дальше — камера телефона или
 * фото своей стены.
 *
 * Клиентский: выбор меняется мгновенно и сразу пишется в адрес
 * (`replaceState`), без запроса на сервер, — ссылка всегда та, что на
 * экране. Сама страница готовится заранее и одна на все рамы: выбор из
 * ссылки читает браузер, сервер его не видит.
 *
 * Камера — только на телефоне (кнопку прячет CSS, как значок на табличке
 * прятал раньше): камеру открывает просмотрщик телефона, а не сайт
 * (ArCamera). Её модель собирается уже в выбранной раме.
 */
export function FittingRoom({
  work,
  siteUrl,
  whatsappPhone,
}: {
  work: FittingWork;
  siteUrl: string;
  /** Для кнопки «Написать о картине» внутри камеры; нет — нет и кнопки. */
  whatsappPhone?: string;
}) {
  const dictionary = useDictionary();
  const t = dictionary.room;
  const lang = useLocale();
  const pathname = usePathname();

  // Выбор из ссылки — пока человек сам ничего не выбрал. Сервер отдаёт
  // страницу без рамы, а сразу за первой отрисовкой браузер ставит ту,
  // что в адресе.
  const search = useSyncExternalStore(noSubscribe, readSearch, noSearch);
  const fromUrl = useMemo(
    () => parseFrameChoice(Object.fromEntries(new URLSearchParams(search))),
    [search],
  );
  const [picked, setPicked] = useState<FrameChoice | null>(null);
  const choice = picked ?? fromUrl;

  function choose(next: FrameChoice): void {
    setPicked(next);
    window.history.replaceState(window.history.state, "", `${pathname}${frameQuery(next)}`);
  }

  const framed = framedCanvas(work.canvas, choice.frame);
  const sizeLine = [
    t.canvasSize(canvasCmText(work.canvas, t.cm)),
    choice.frame === "none" ? null : t.framedSize(canvasCmText(framed, t.cm)),
  ]
    .filter(Boolean)
    .join(" · ");

  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showHint = useCallback((text: string) => {
    clearTimeout(hintTimer.current);
    setHint(text);
    hintTimer.current = setTimeout(() => setHint(null), hintDuration);
  }, []);
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const arCamera = useArCamera(showHint);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  // Резьбы и лепнины в камере нет (решение 5 TICKETS-ar.md) — об этом
  // говорит подготовка, каждый раз, а не только в первый.
  const isCarved = choice.frame === "classic" || choice.frame === "baroque";

  function cameraModel(version: string): ArCameraModel {
    const message = fittingMessage({
      works: [
        {
          title: work.title,
          choice,
          url: `${siteUrl}${roomPageUrl(work.id, choice, lang)}`,
        },
      ],
      place: "camera",
      t,
    });
    return {
      usdzUrl: arFileUrl(work.id, "model.usdz", version, choice),
      glbUrl: arFileUrl(work.id, "model.glb", version, choice),
      title: work.title,
      subtitle: sizeLine,
      contactUrl: whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
        : undefined,
    };
  }

  // Камеру телефона браузер открывает только из нажатия, поэтому её
  // запускает само нажатие — на кнопку или на «Понятно, открыть».
  function openCamera(): void {
    if (work.arVersion === null) return;
    const platform = arCamera.detect();
    const isPhone = platform === "ios" || platform === "android";
    if (isPhone && (!hasSeenArGuide() || isCarved)) {
      setIsGuideOpen(true);
      return;
    }
    arCamera.launch(platform, cameraModel(work.arVersion));
  }

  function startFromGuide(): void {
    rememberArGuide();
    setIsGuideOpen(false);
    if (work.arVersion !== null) arCamera.launch(arCamera.detect(), cameraModel(work.arVersion));
  }

  return (
    <div className="fit">
      <header className="fit-bar">
        <Link
          href={localePath(lang, `/gallery/${work.id}`)}
          className="fit-back"
          aria-label={t.back}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="fit-back-text">{t.back}</span>
        </Link>
        <h1 className="fit-title">
          <span className="fit-title-main">{t.heading}</span>
          <span className="fit-title-work">{work.title}</span>
        </h1>
      </header>

      <div className="fit-stage">
        <FramedPainting
          src={work.src}
          alt={work.alt}
          choice={choice}
          canvas={work.canvas}
          sizes="(max-width: 1023px) 80vw, 50vw"
          priority
        />
      </div>

      <div className="fit-panel">
        <p className="fit-size">{sizeLine}</p>

        <FramePicker choice={choice} onChange={choose} name="fit" />

        <div className="fit-actions">
          {work.arVersion !== null && (
            <Button variant="primary" size="lg" block className="fit-camera" onClick={openCamera}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="7" width="18" height="13" rx="2.5" />
                  <path d="M8.5 7l1.4-2.5h4.2L15.5 7" />
                  <circle cx="12" cy="13.5" r="3.6" />
                </g>
              </svg>
              {t.openCamera}
            </Button>
          )}
        </div>

        {hint && (
          <p className="fit-hint" role="status">
            {hint}
          </p>
        )}
      </div>

      <ArQuickLookLink
        linkRef={arCamera.linkRef}
        href={work.arVersion ? arFileUrl(work.id, "model.usdz", work.arVersion, choice) : "#"}
      />
      <ArGuide
        isOpen={isGuideOpen}
        photo={work.src}
        title={work.title}
        size={sizeLine}
        note={isCarved ? t.noCarving : undefined}
        onStart={startFromGuide}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
