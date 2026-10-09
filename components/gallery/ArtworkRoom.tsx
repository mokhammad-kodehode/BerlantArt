"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { ArQuickLookLink, useArCamera, type ArCameraModel } from "@/components/gallery/ArCamera";
import { ArGuide, hasSeenArGuide, rememberArGuide } from "@/components/gallery/ArGuide";
import { PictureLamp } from "@/components/gallery/PictureLamp";
import { ContactIcon } from "@/components/ui/ContactIcon";
import { arFileUrl, arPageUrl, roomPageUrl } from "@/lib/ar-links";
import {
  finishFor,
  frameFinish,
  frameModel,
  framedSides,
  roomFrames,
  roomMessage,
  roomQuery,
  roomWalls,
  type CanvasSides,
  type RoomOptions,
} from "@/lib/room-options";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/** Пауза между появлением картины в темноте и щелчком выключателя. */
const SWITCH_DELAY_MS = 700;

/** Сколько ждать, пока браузер раскодирует фотографию, прежде чем показывать её. */
const DECODE_WAIT_MS = 1500;

/**
 * Инструменты нижней строки на телефоне. Рама и стена открывают ряд
 * вариантов — соответствующий раздел панели (у рамы в нём и цвет:
 * цвет — свойство рамы, а не отдельный инструмент, так попросил заказчик); «картина» — ряд
 * миниатюр. Свет и «издали» инструментами не считаются: это мгновенные
 * переключатели, ряда вариантов у них нет.
 */
type RoomTool = "painting" | "frame" | "wall";

/** Подписи инструментов — в словаре (room.tabs), здесь только порядок и значки. */
const roomTools: { id: RoomTool; icon: IconName }[] = [
  { id: "painting", icon: "painting" },
  { id: "frame", icon: "frame" },
  { id: "wall", icon: "wall" },
];

type IconName =
  | "sun"
  | "moon"
  | "zoom-in"
  | "zoom-out"
  | "settings"
  | "collapse"
  | "painting"
  | "frame"
  | "wall"
  | "info"
  | "close"
  | "camera"
  | "help";

/**
 * Иконки примерочной: солнце — день, луна — вечер, лупа с минусом —
 * отдалить, с плюсом — вернуться к картине, ползунки — настройки,
 * стрелка — убрать панель, и значки инструментов нижней строки.
 * Линией, как значки контактов, цвет — от текста кнопки. Размер —
 * пропсом: классы размера сильнее любых правил globals.css.
 */
function ViewIcon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )}
      {name === "moon" && <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />}
      {name === "settings" && (
        <>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </>
      )}
      {/* Стрелка «убрать»: на компьютере панель уезжает вправо, на
          телефоне вниз — поворот задаёт CSS (.room-panel-close svg). */}
      {name === "collapse" && <path d="m9 6 6 6-6 6" />}
      {name === "painting" && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m21 16-5-5-9 9" />
        </>
      )}
      {name === "frame" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <rect x="7.5" y="7.5" width="9" height="9" />
        </>
      )}
      {name === "wall" && (
        <>
          <rect x="3" y="3" width="15" height="6" rx="1.5" />
          <path d="M18 6h2v5h-8v3" />
          <rect x="10.5" y="14" width="3" height="7" rx="1" />
        </>
      )}
      {name === "info" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </>
      )}
      {name === "close" && <path d="M6 6l12 12M18 6 6 18" />}
      {name === "help" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
        </>
      )}
      {name === "camera" && (
        <>
          <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
          <circle cx="12" cy="13" r="3.5" />
        </>
      )}
      {(name === "zoom-in" || name === "zoom-out") && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m20 20-4.8-4.8M7.5 10.5h6" />
          {name === "zoom-in" && <path d="M10.5 7.5v6" />}
        </>
      )}
    </svg>
  );
}

/** Работа в полосе «другая картина». */
export type RoomThumb = { id: string; title: string; src: string };

/**
 * Примерочная: картина на стене в выбранной раме, днём или под лампой,
 * при желании — над диваном в одном масштабе с ним.
 *
 * Клиентский компонент по двум причинам. Раму нужно построить по форме
 * холста, а размеров фотографий в базе нет — форма берётся у загруженной
 * картинки и уходит в CSS переменной --ar; от неё CSS считает всё
 * остальное (globals.css, блок «примерочная»). И выбор должен меняться
 * мгновенно: он переписывает адрес страницы прямо в браузере
 * (history.replaceState — Next синхронизирует с ним роутер), без запроса
 * на сервер, но ссылка при этом всегда отражает то, что на экране.
 *
 * Смена картины — обычная ссылка на примерочную другой работы с тем же
 * выбором в адресе. Компонент при этом не пересоздаётся: выбор и свет
 * остаются, а рама перестраивается, когда загрузится новая фотография.
 *
 * Режим `camera` — примерка через камеру телефона (AR-4, TICKETS-ar.md):
 * та же рама и тот же выбор, но стены, дивана и вечера нет — стена
 * в камере настоящая, и свет даёт сама комната. Главная кнопка —
 * «Открыть камеру». Отдельный компонент повторил бы всю раму, панель
 * и строку инструментов, и они разошлись бы при первой правке.
 */
export function ArtworkRoom({
  variant = "room",
  work,
  works,
  initialOptions,
  arVersion,
  whatsappPhone,
  siteUrl,
}: {
  variant?: "room" | "camera";
  work: {
    id: string;
    title: string;
    src: string;
    /** Строка для таблички: техника, размер, год — что известно. */
    details?: string;
    /** Стороны холста в сантиметрах. null — диван для масштаба не показываем. */
    sides: CanvasSides | null;
  };
  works: RoomThumb[];
  initialOptions: RoomOptions;
  /** Версия модели для камеры (lib/ar.ts); null — эту работу в камере не показать. */
  arVersion: string | null;
  whatsappPhone?: string;
  siteUrl: string;
}) {
  const isCamera = variant === "camera";
  const dictionary = useDictionary();
  const t = dictionary.room;
  const tSite = dictionary.site;
  const lang = useLocale();
  const pathname = usePathname();
  // В камере вечера и дивана нет: пришедшие в адресе, они бы только
  // затемнили картину в превью.
  const [options, setOptions] = useState<RoomOptions>(
    isCamera ? { ...initialOptions, light: "day", hasSofa: false } : initialOptions,
  );
  const [aspect, setAspect] = useState<number | null>(null);
  const [isLampOn, setIsLampOn] = useState(false);
  const [isStripOpen, setIsStripOpen] = useState(false);
  // Открытый инструмент нижней строки на телефоне; null — ряд вариантов
  // закрыт и видна вся комната. На компьютере разделы панели видны все
  // сразу, и это состояние ни на что не влияет.
  //
  // Сразу открыт выбор рамы (заказчик, 9.10.2026): по умолчанию картина
  // без рамы, и ряд рам с цветами на виду подсказывает, что её можно
  // примерить, — за кнопку «Рама» внизу человек мог и не заглянуть.
  const [tool, setTool] = useState<RoomTool | null>("frame");
  // Карточка «о картине» на телефоне: табличке на стене там нет места.
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  // Короткая подсказка над сценой — сейчас одна: почему «издали» не
  // работает у картины без размера.
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Панель можно убрать, чтобы смотреть на комнату целиком. В адрес это
  // не пишется: ссылку пересылают ради рамы и стены, а не ради того,
  // открыта ли у отправителя панель.
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  // Экран подготовки к камере (ArGuide).
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const lampTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isReady = aspect !== null;

  useEffect(() => {
    if (!isReady) return;
    lampTimer.current = setTimeout(() => setIsLampOn(true), SWITCH_DELAY_MS);
    return () => clearTimeout(lampTimer.current);
  }, [isReady]);

  function readAspect(image: HTMLImageElement | null) {
    if (image === null || !image.complete || image.naturalWidth === 0) return;
    const ratio = image.naturalWidth / image.naturalHeight;

    // Загружена — ещё не значит готова к показу: раскодирует браузер
    // отдельно, и без ожидания свет загорался над чёрным холстом. Но ждём
    // не дольше DECODE_WAIT_MS: в скрытой вкладке decode() не завершается,
    // пока её не откроют, и комната осталась бы тёмной навсегда.
    const show = () => setAspect(ratio);
    const timeout = new Promise((resolve) => setTimeout(resolve, DECODE_WAIT_MS));
    Promise.race([image.decode(), timeout]).then(show, show);
  }

  function update(patch: Partial<RoomOptions>) {
    const merged = { ...options, ...patch };
    // Сменили модель — покрытие должно у неё быть: у тонкой алюминиевой
    // нет «ореха», у барокко нет «тёмно-синего». Подходящее сохраняется.
    const next = { ...merged, finish: finishFor(merged.frame, merged.finish) };
    setOptions(next);
    window.history.replaceState(null, "", `${pathname}${roomQuery(next)}`);

    // Переход на вечер — щелчок выключателя: темнота, потом лампа
    // с запинкой. Без этого свет просто появлялся бы, как смена слайда.
    if (patch.light === "evening" && options.light !== "evening") {
      clearTimeout(lampTimer.current);
      setIsLampOn(false);
      lampTimer.current = setTimeout(() => setIsLampOn(true), 450);
    }
  }

  // Размер из базы без ориентации: какая сторона ширина, решает фотография.
  const sides = work.sides;
  const isLandscape = (aspect ?? 1) >= 1;
  const widthCm = sides === null ? 0 : isLandscape ? sides.long : sides.short;
  const heightCm = sides === null ? 0 : isLandscape ? sides.short : sides.long;
  const isSofaShown = options.hasSofa && sides !== null && isReady;

  const style: CSSProperties & {
    "--ar": number;
    "--wcm": number;
    "--hcm": number;
    "--wref": number;
  } = {
    "--ar": aspect ?? 1,
    "--wcm": widthCm,
    "--hcm": heightCm,
    // Ширина холста в сантиметрах для толщины рамы. Размер неизвестен —
    // 60 см, средний из списка админки: рама будет правдоподобной толщины.
    "--wref": sides === null ? 60 : widthCm,
  };

  const model = frameModel(options.frame);
  const finish = frameFinish(options.finish);
  const modelLabel = t.frames[options.frame].label;
  const finishLabel = t.finishes[options.finish];
  const wallLabel = t.walls[options.wall].label;

  // Размеры для итога: холст и, если есть рама, — вместе с ней. Сколько
  // картина займёт на стене, покупатель и прикидывает, выбирая место.
  const orient = (value: CanvasSides) =>
    isLandscape
      ? `${value.long} × ${value.short} ${t.cm}`
      : `${value.short} × ${value.long} ${t.cm}`;
  const framed = sides === null ? null : framedSides(sides, options.frame);

  // Стабильная ссылка на функцию: кнопка камеры зовёт её из эффекта.
  const showHint = useCallback((text: string) => {
    clearTimeout(hintTimer.current);
    setHint(text);
    hintTimer.current = setTimeout(() => setHint(null), 5000);
  }, []);

  // «Издали» есть у каждой картины, а не только у картин с размером:
  // кнопка, которая то появляется, то нет, выглядит поломкой — на iPhone
  // заказчик решил, что она не поместилась. Без размера диван показать
  // честно нельзя, и кнопка говорит об этом словами.
  function toggleFarView() {
    if (sides === null) {
      showHint(t.noSize);
      return;
    }
    update({ hasSofa: !options.hasSofa });
  }

  const toggleTool = (id: RoomTool) => setTool((current) => (current === id ? null : id));

  const query = roomQuery(options);
  const message = isCamera
    ? roomMessage(
        work.title,
        options,
        `${siteUrl}${arPageUrl(work.id, options, lang)}`,
        "camera",
        lang,
      )
    : roomMessage(
        work.title,
        options,
        `${siteUrl}${roomPageUrl(work.id, options, lang)}`,
        "room",
        lang,
      );

  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
    : undefined;

  // Модель зависит только от рамы: адрес меняется вместе с выбором.
  // Подпись плашки в камере — размер: по нему человек сверяет картину
  // со стеной, а цифра «в раме» — то, что займёт место.
  const camera: ArCameraModel | null =
    arVersion === null
      ? null
      : {
          usdzUrl: arFileUrl(work.id, "model.usdz", arVersion, options),
          glbUrl: arFileUrl(work.id, "model.glb", arVersion, options),
          title: work.title,
          subtitle: [
            sides === null ? null : t.canvasSize(orient(sides)),
            framed === null || options.frame === "none" ? null : t.framedSize(orient(framed)),
          ]
            .filter(Boolean)
            .join(" · "),
          contactUrl: whatsappUrl,
        };

  const arCamera = useArCamera(camera, showHint);

  // Экран подготовки — при первом открытии камеры на этом телефоне: без
  // него на iPhone было непонятно, почему картина полупрозрачная и куда
  // вести телефон. Где камеры нет, сразу объясняем словами почему.
  function requestCamera() {
    const platform = arCamera.detect();
    const canOpen = platform === "ios" || platform === "android";
    if (canOpen && !hasSeenArGuide()) {
      setIsGuideOpen(true);
      return;
    }
    arCamera.launch(platform);
  }

  function startFromGuide() {
    rememberArGuide();
    setIsGuideOpen(false);
    arCamera.launch(arCamera.detect());
  }

  // Режимы с той же рамой: камера и стена. Переключатель есть, только если
  // работу можно показать в камере, — иначе режим один.
  const modes =
    camera === null
      ? null
      : [
          {
            id: "camera",
            href: arPageUrl(work.id, options, lang),
            label: t.modeCamera,
            icon: "camera" as const,
            isCurrent: isCamera,
          },
          {
            id: "wall",
            href: roomPageUrl(work.id, options, lang),
            label: t.modeWall,
            icon: "frame" as const,
            isCurrent: !isCamera,
          },
        ];

  // Упрощение рамы в камере (решение 5): резьбы и лепнины там нет.
  const isCarvedFrame = options.frame === "classic" || options.frame === "baroque";

  return (
    <section
      className="room"
      data-variant={variant}
      style={style}
      data-ready={isReady}
      data-mode={options.light}
      data-light={isLampOn ? "on" : "off"}
      data-wall={options.wall}
      data-frame={options.frame}
      data-finish={options.finish}
      data-finish-kind={finish.kind}
      data-sofa={isSofaShown}
      data-has-size={sides !== null}
      data-panel={isPanelOpen ? "open" : "closed"}
      data-tool={tool ?? undefined}
      data-modes={modes !== null || undefined}
      aria-label={t.label(work.title)}
    >
      <div className="room-bar flex flex-wrap items-center justify-between gap-3 px-[clamp(12px,4vw,48px)] pt-4 md:pt-6 lg:pr-[calc(var(--panel-w)+24px)]">
        {/* На телефоне — только стрелка: строка узкая, а подпись у ссылки
            остаётся для скринридера. */}
        <Link
          href={localePath(lang, `/gallery/${work.id}`)}
          className="room-pill text-[15px] max-lg:w-10 max-lg:justify-center max-lg:px-0"
          aria-label={t.back}
        >
          <span aria-hidden="true">←</span>
          <span className="max-lg:hidden">{t.back}</span>
        </Link>

        {/* Название и размер — на телефоне вместо таблички на стене. */}
        <p className="room-heading m-0 min-w-0 flex-1 text-center lg:hidden">
          <span className="block truncate text-[14px]">{work.title}</span>
          {sides !== null && <span className="block text-[12px] opacity-75">{orient(sides)}</span>}
        </p>

        {/*
          Переключатель режимов — крупно и с подписями: со страницы работы
          ведёт одна кнопка, и второй режим можно найти только здесь.
          Прежде это был значок в 40px, на телефоне его не замечали.
          На телефоне — отдельной строкой во всю ширину (order-last
          и flex-wrap у строки): в одну строку с названием он не влезает.
        */}
        {modes !== null && (
          <nav className="room-modes" aria-label={t.modes}>
            {modes.map((mode) => (
              <Link
                key={mode.id}
                href={mode.href}
                className="room-mode"
                aria-current={mode.isCurrent ? "page" : undefined}
                replace
              >
                <ViewIcon name={mode.icon} />
                {mode.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex gap-2">
          {isCamera && camera !== null && (
            <button
              type="button"
              className="room-pill text-[15px] max-lg:w-10 max-lg:justify-center max-lg:px-0"
              aria-label={t.howItWorks}
              aria-haspopup="dialog"
              onClick={() => setIsGuideOpen(true)}
            >
              <ViewIcon name="help" />
              <span className="max-lg:hidden">{t.howItWorks}</span>
            </button>
          )}

          {/* Другую картину в камере не предлагаем: у многих работ её нет. */}
          {!isCamera && (
            <button
              type="button"
              className="room-pill text-[15px] max-lg:hidden"
              aria-expanded={isStripOpen}
              aria-controls="room-strip"
              onClick={() => setIsStripOpen((value) => !value)}
            >
              {t.otherPainting}
            </button>
          )}

          <button
            type="button"
            className="room-pill w-10 justify-center px-0 lg:hidden"
            aria-expanded={isInfoOpen}
            aria-controls="room-info"
            aria-label={t.about}
            onClick={() => setIsInfoOpen((value) => !value)}
          >
            <ViewIcon name="info" />
          </button>

          {/* На компьютере эта кнопка — главная, внизу боковой панели;
              здесь она только на телефоне, где боковой панели нет. */}
          {whatsappPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="room-pill w-10 justify-center px-0 text-[15px] lg:hidden"
              aria-label={t.writeWhatsapp}
            >
              <ContactIcon id="whatsapp" className="size-[18px]" />
            </a>
          )}
        </div>
      </div>

      {isInfoOpen && (
        <div id="room-info" className="room-info" role="dialog" aria-label={t.about}>
          <button
            type="button"
            className="room-info-close"
            aria-label={t.close}
            onClick={() => setIsInfoOpen(false)}
          >
            <ViewIcon name="close" />
          </button>
          <p className="room-info-title">{work.title}</p>
          <p className="m-0 text-[14px]">{tSite.artist}</p>
          {work.details && <p className="mt-1 mb-0 text-[13px] opacity-75">{work.details}</p>}
          {sides !== null && (
            <dl className="room-sizes mt-3">
              <dt>{t.canvas}</dt>
              <dd>{orient(sides)}</dd>
              {framed !== null && options.frame !== "none" && (
                <>
                  <dt>{t.framed}</dt>
                  <dd>{orient(framed)}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}

      <div className="room-scene">
        <div className="room-piece">
          <div className="room-floor" aria-hidden="true" />

          <div className="room-frame">
            <span aria-hidden="true" className="room-rail room-rail-top" />
            <span aria-hidden="true" className="room-rail room-rail-right" />
            <span aria-hidden="true" className="room-rail room-rail-bottom" />
            <span aria-hidden="true" className="room-rail room-rail-left" />

            <div className="room-canvas">
              <Image
                src={work.src}
                alt={work.title}
                fill
                sizes="(max-width: 767px) 74vw, 54vw"
                className="object-cover"
                onLoad={(event) => readAspect(event.currentTarget)}
                // Фотография из кэша успевает загрузиться раньше, чем страница
                // оживёт, и событие загрузки проходит мимо — поэтому готовность
                // проверяется и сразу, как только элемент появился.
                ref={readAspect}
                priority
              />
            </div>
          </div>

          <div className="room-sofa" aria-hidden="true">
            {/*
              Снимок 3D-модели из Meshy, отрисованный строго спереди на
              прозрачном фоне. Сама модель (16.5 МБ, 200 тыс. точек) на сайт
              не идёт — снимок весит 56 КБ. Лицензия модели — CC BY 4.0,
              поэтому в примерочной есть подпись «Диван — модель Meshy».
            */}
            <Image
              src="/room/sofa.webp"
              alt=""
              width={1680}
              height={688}
              sizes="(max-width: 1023px) 110vw, 60vw"
            />
          </div>

          <div className="room-light" aria-hidden="true">
            <div className="room-beam" />
          </div>

          <div className="room-lamp" aria-hidden="true">
            <PictureLamp />
          </div>

          <div className="room-glow" aria-hidden="true" />
          <div className="room-shine" aria-hidden="true" />

          <div className="room-label">
            <p className="font-heading m-0 text-[14px] leading-snug min-[1100px]:text-[17px]">
              {work.title}
            </p>
            <p className="mt-1 mb-0 text-[11px] min-[1100px]:mt-1.5 min-[1100px]:text-[13px]">
              {tSite.artist}
            </p>
            {work.details && (
              <p className="mt-0.5 mb-0 text-[11px] opacity-80 min-[1100px]:text-[12px]">
                {work.details}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="room-dark" aria-hidden="true" />

      {/* Вернуть убранную панель — в правом нижнем углу. Сплошной
          плашкой, как «К работе»: прозрачную на полу было не разглядеть.
          Пока панель открыта, кнопки нет: закрывают её в самой панели. */}
      {!isPanelOpen && (
        <button
          type="button"
          className="room-pill room-panel-open text-[15px]"
          aria-controls="room-panel"
          aria-expanded={false}
          onClick={() => setIsPanelOpen(true)}
        >
          <ViewIcon name="settings" />
          {t.settings}
        </button>
      )}

      {(isStripOpen || tool === "painting") && (
        <div className="room-strip-wrap">
          <ul id="room-strip" className="room-strip" aria-label={t.otherWorks}>
            {works.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${localePath(lang, `/gallery/${item.id}/room`)}${query}`}
                  aria-current={item.id === work.id ? "page" : undefined}
                  className="room-thumb"
                  title={item.title}
                >
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <aside
        id="room-panel"
        className="room-panel"
        aria-label={t.settingsLabel}
        // Убранная панель недоступна и для клавиатуры: inert не пускает
        // в неё фокус, иначе Tab уводил бы в невидимые кнопки.
        inert={!isPanelOpen}
      >
        <button
          type="button"
          className="room-panel-close"
          aria-controls="room-panel"
          aria-expanded={isPanelOpen}
          aria-label={t.hideSettings}
          title={t.hideSettings}
          onClick={() => setIsPanelOpen(false)}
        >
          <ViewIcon name="collapse" />
        </button>

        <header className="room-panel-head">
          <p className="room-kicker">{isCamera ? t.kickerCamera : t.kicker}</p>
          <h1 className="room-panel-title">{work.title}</h1>
        </header>

        {/*
          Вид — первым разделом, над рамами. Прежде день, вечер и «издали»
          были прозрачными кнопками на самой сцене и на коричневом полу
          почти не читались (заказчик). В панели они на тёмном фоне и видны
          при любой стене. На телефоне этого раздела нет: там те же кнопки
          в нижней строке инструментов.
        */}
        {!isCamera && (
          <section className="room-section max-lg:hidden">
            {/* Свет — переключателем с солнцем и луной, без заголовка
                раздела: по просьбе заказчика заголовок «Вид» и две
                кнопки с подписями были лишними, значки говорят сами. */}
            <button
              type="button"
              role="switch"
              className="room-daynight"
              aria-checked={options.light === "evening"}
              aria-label={t.eveningLabel}
              title={options.light === "evening" ? t.eveningTitle : t.dayTitle}
              onClick={() => update({ light: options.light === "evening" ? "day" : "evening" })}
            >
              <ViewIcon name="sun" />
              <ViewIcon name="moon" />
            </button>
            <button
              type="button"
              className="room-far"
              aria-pressed={isSofaShown}
              onClick={toggleFarView}
            >
              <ViewIcon name={isSofaShown ? "zoom-in" : "zoom-out"} />
              {isSofaShown ? t.backToPainting : t.viewFromAfar}
            </button>
          </section>
        )}

        <section className="room-section" data-active={tool === "frame"}>
          <h2 className="room-section-title" id="room-frame-title">
            <span className="room-section-name">{t.frame}</span>
            <span className="room-section-value">
              {options.frame === "none"
                ? modelLabel
                : t.frameSummary(modelLabel, model.widthCm, finishLabel)}
            </span>
          </h2>
          <div className="room-models" role="radiogroup" aria-labelledby="room-frame-title">
            {roomFrames.map((frame) => (
              <label key={frame.id} className="room-model" title={t.frames[frame.id].note}>
                <input
                  type="radio"
                  name="room-frame"
                  value={frame.id}
                  checked={options.frame === frame.id}
                  onChange={() => update({ frame: frame.id })}
                />
                <span
                  aria-hidden="true"
                  className="room-swatch room-swatch-frame"
                  data-frame={frame.id}
                  data-finish={finishFor(frame.id, options.finish)}
                />
                <span className="room-model-name">{t.frames[frame.id].label}</span>
                <span className="room-model-meta">
                  {frame.widthCm === 0 ? t.canvasOnly : t.frameWidth(frame.widthCm)}
                </span>
              </label>
            ))}
          </div>

          {/* Цвет — внутри раздела «Рама», вторым рядом: это свойство
              выбранной рамы, и у каждой модели свой набор. У холста
              без рамы цвета нет — ряда нет. */}
          {model.finishes.length > 0 && (
            <div className="room-finishes">
              <p className="room-subtitle" id="room-finish-title">
                {t.frameColor}
              </p>
              <div className="room-swatches" role="radiogroup" aria-labelledby="room-finish-title">
                {model.finishes.map((id) => {
                  return (
                    <label
                      key={id}
                      title={t.finishes[id]}
                      className="room-swatch room-swatch-finish"
                      data-finish={id}
                    >
                      <input
                        type="radio"
                        name="room-finish"
                        value={id}
                        aria-label={t.finishes[id]}
                        checked={options.finish === id}
                        onChange={() => update({ finish: id })}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* В разделе рамы, а не у кнопки: на телефоне низ панели скрыт,
              а раздел рамы открывается и там. */}
          {isCamera && isCarvedFrame && <p className="room-note mt-3">{t.noCarving}</p>}
        </section>

        {!isCamera && (
          <section className="room-section" data-active={tool === "wall"}>
            <h2 className="room-section-title" id="room-wall-title">
              <span className="room-section-name">{t.wall}</span>
              <span className="room-section-value">{wallLabel}</span>
            </h2>
            <div className="room-swatches" role="radiogroup" aria-labelledby="room-wall-title">
              {roomWalls.map((wall) => (
                <label
                  key={wall.id}
                  title={t.walls[wall.id].label}
                  className="room-swatch"
                  style={{ background: `var(--wall-${wall.id})` }}
                >
                  <input
                    type="radio"
                    name="room-wall"
                    value={wall.id}
                    aria-label={t.walls[wall.id].label}
                    checked={options.wall === wall.id}
                    onChange={() => update({ wall: wall.id })}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <footer className="room-summary">
          {sides !== null && (
            <dl className="room-sizes">
              <dt>{t.canvas}</dt>
              <dd>{orient(sides)}</dd>
              {framed !== null && options.frame !== "none" && (
                <>
                  <dt>{t.framed}</dt>
                  <dd>{orient(framed)}</dd>
                </>
              )}
            </dl>
          )}

          {isCamera && camera !== null && (
            <>
              <button type="button" className="room-cta" onClick={requestCamera}>
                <ViewIcon name="camera" className="size-5" />
                {t.openCamera}
              </button>
              <p className="room-note">{t.cameraLead}</p>
            </>
          )}

          {whatsappPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="room-cta"
              data-secondary={isCamera || undefined}
            >
              <ContactIcon id="whatsapp" className="size-5" />
              {t.write}
            </a>
          )}
        </footer>
      </aside>

      {/*
        Строка инструментов — только на телефоне. Всё управление в одном
        месте, как в редакторе фото: прежде кнопки вида висели над панелью
        и наезжали на табличку, а «Настройки» — на «Ближе» (найдено на
        iPhone 15).
      */}
      <nav className="room-toolbar" aria-label={t.toolbar}>
        {/* В камере из инструментов остаётся только рама — стена и свет там настоящие. */}
        {roomTools
          .filter((item) => !isCamera || item.id === "frame")
          .map((item) => (
            <button
              key={item.id}
              type="button"
              className="room-tool"
              aria-pressed={tool === item.id}
              onClick={() => toggleTool(item.id)}
            >
              <ViewIcon name={item.icon} className="size-[22px]" />
              {t.tabs[item.id]}
            </button>
          ))}

        {isCamera && camera !== null && (
          <button type="button" className="room-tool" onClick={requestCamera}>
            <ViewIcon name="camera" className="size-[22px]" />
            {t.openCamera}
          </button>
        )}

        {!isCamera && (
          <>
            <button
              type="button"
              className="room-tool"
              aria-pressed={options.light === "evening"}
              aria-label={options.light === "evening" ? t.eveningToDay : t.dayToEvening}
              onClick={() => update({ light: options.light === "evening" ? "day" : "evening" })}
            >
              <ViewIcon
                name={options.light === "evening" ? "moon" : "sun"}
                className="size-[22px]"
              />
              {options.light === "evening" ? t.evening : t.day}
            </button>

            <button
              type="button"
              className="room-tool"
              aria-pressed={isSofaShown}
              aria-label={isSofaShown ? t.closer : t.afar}
              onClick={toggleFarView}
            >
              <ViewIcon name={isSofaShown ? "zoom-in" : "zoom-out"} className="size-[22px]" />
              {isSofaShown ? t.closerShort : t.afarShort}
            </button>
          </>
        )}
      </nav>

      {/* Лицензия CC BY 4.0 требует указать, что модель создана в Meshy.
          Подпись видна, только когда диван в кадре: без дивана она ни к чему. */}
      {isSofaShown && (
        <p className="room-credit">
          {t.sofaCredit}{" "}
          <a href="https://www.meshy.ai" target="_blank" rel="noopener noreferrer">
            Meshy
          </a>{" "}
          · CC BY 4.0
        </p>
      )}

      {isCamera && camera !== null && (
        <>
          <ArQuickLookLink linkRef={arCamera.linkRef} href={camera.usdzUrl} />
          <ArGuide
            isOpen={isGuideOpen}
            photo={work.src}
            title={work.title}
            size={camera.subtitle}
            onStart={startFromGuide}
            onClose={() => setIsGuideOpen(false)}
          />
        </>
      )}

      {/* role="status" — скринридер зачитает подсказку, не сбивая фокус. */}
      <p className="room-hint" role="status">
        {hint}
      </p>
    </section>
  );
}
