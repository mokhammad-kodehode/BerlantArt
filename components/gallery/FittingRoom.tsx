"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ArQuickLookLink, useArCamera, type ArCameraModel } from "@/components/gallery/ArCamera";
import { ArGuide, hasSeenArGuide, rememberArGuide } from "@/components/gallery/ArGuide";
import { FramePicker } from "@/components/gallery/FramePicker";
import { FramedPainting } from "@/components/gallery/FramedPainting";
import { WorkPicker } from "@/components/gallery/WorkPicker";
import { Button } from "@/components/ui/Button";
import { arFileUrl, roomPageUrl, wallPhotoUrl } from "@/lib/ar-links";
import { fetchArtworkFeed } from "@/lib/artwork-thumbs";
import {
  fittingUrl,
  fittingWorks,
  parseHangWork,
  type FittingEntry,
  type FittingWork,
} from "@/lib/fitting-works";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";
import {
  canvasCmText,
  fittingMessage,
  framedCanvas,
  parseFrameChoice,
  type FrameChoice,
} from "@/lib/room-options";

/** Сколько держится подсказка под кнопками. */
const hintDuration = 6000;

/** Миниатюра картины в строке «Сменить»: длинная сторона в пикселях. */
const workThumbSide = 50;

/**
 * Редактор фото стены — отдельным файлом: экрану «Картина и рама» он не
 * нужен, и человек, который пришёл за камерой, его не скачивает.
 * Только в браузере: фото и canvas на сервере не бывает.
 */
const WallEditor = dynamic(
  () => import("@/components/gallery/wall/WallEditor").then((module) => module.WallEditor),
  { ssr: false },
);

/** Метка в адресе, пока открыто фото стены: «назад» на телефоне закрывает его, а не страницу. */
const wallHash = "#wall";

// Адрес меняет только сама примерочная (replaceState), события об этом
// нет — подписываться не на что: адрес читается при отрисовке.
const noSubscribe = () => () => {};
const readSearch = () => window.location.search;
const noSearch = () => "";

/** QR-код для телефона и ссылка, по которой он нарисован. */
type PhoneCode = { text: string; size: number; path: string };

/**
 * Примерочная «Повесить у себя» (TICKETS-primerka.md): картина в выбранной
 * раме, ряд моделей и цветов, дальше — камера телефона или фото своей стены.
 *
 * Открывается двумя путями, это один компонент (заказчик, 23.10.2026):
 * — из меню (`entry="hang"`, /hang): картина не выбрана, на стене пустое
 *   место, в панели — список работ (WorkPicker);
 * — со страницы работы (`entry="work"`, /gallery/…/room): картина уже на
 *   стене, «Сменить» открывает тот же список. Картина меняется на месте,
 *   без перехода, и рама остаётся прежней.
 *
 * Клиентский: выбор меняется мгновенно и сразу пишется в адрес
 * (`replaceState`), без запроса на сервер, — ссылка всегда та, что на
 * экране. Сами страницы готовятся заранее: выбор из ссылки читает браузер,
 * сервер его не видит. Список работ — общий для сайта файл
 * /api/artwork-thumbs (lib/artwork-thumbs.ts), его же листает лента.
 *
 * Камера — только на телефоне (кнопку прячет CSS): камеру открывает
 * просмотрщик телефона, а не сайт (ArCamera). Её модель собирается уже
 * в выбранной раме.
 */
export function FittingRoom({
  entry,
  work: initialWork,
  siteUrl,
  whatsappPhone,
}: {
  entry: FittingEntry;
  /** Картина со страницы работы; из меню — null, её выбирают здесь. */
  work: FittingWork | null;
  siteUrl: string;
  /** Для кнопки «Написать о картине» внутри камеры; нет — нет и кнопки. */
  whatsappPhone?: string;
}) {
  const dictionary = useDictionary();
  const t = dictionary.room;
  const lang = useLocale();

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

  // Список работ нужен сразу, если пришли из меню, и по «Сменить», если
  // со страницы работы. Грузится один раз: модуль помнит ответ.
  const [isPicking, setIsPicking] = useState(false);
  const [feed, setFeed] = useState<FittingWork[] | null>(null);
  const [isFeedFailed, setIsFeedFailed] = useState(false);
  const needsFeed = entry === "hang" || isPicking;
  useEffect(() => {
    if (!needsFeed || feed !== null) return;
    let isCurrent = true;
    fetchArtworkFeed().then(
      (list) => {
        if (!isCurrent) return;
        setFeed(fittingWorks(list, lang));
        setIsFeedFailed(false);
      },
      () => {
        if (isCurrent) setIsFeedFailed(true);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [needsFeed, feed, lang]);

  // Картина на стене: выбранная здесь, иначе — со страницы работы или, на
  // «Повесить у себя», из ссылки (`?work=…`), когда список загрузится.
  const [chosen, setChosen] = useState<FittingWork | null>(null);
  const urlWorkId = entry === "hang" ? parseHangWork(search) : null;
  const urlWork = urlWorkId === null ? null : (feed?.find((item) => item.id === urlWorkId) ?? null);
  const work = chosen ?? initialWork ?? urlWork;
  const isListOpen = work === null || isPicking;
  // Пока список открыт, наведённая работа висит на стене вместо выбранной.
  const [preview, setPreview] = useState<FittingWork | null>(null);
  const wallWork = (isListOpen ? preview : null) ?? work;

  function replaceUrl(workId: string | null, next: FrameChoice): void {
    window.history.replaceState(window.history.state, "", fittingUrl(entry, lang, workId, next));
  }

  function choose(next: FrameChoice): void {
    setPicked(next);
    replaceUrl(work?.id ?? null, next);
  }

  function pick(next: FittingWork): void {
    setChosen(next);
    setIsPicking(false);
    setPreview(null);
    replaceUrl(next.id, choice);
    // Список длинный, выбирали где-то внизу — наверх, к стене и рамам.
    const isCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: isCalm ? "auto" : "smooth" });
  }

  function keepWork(): void {
    setIsPicking(false);
    setPreview(null);
  }

  const sizeLine =
    work === null
      ? ""
      : [
          t.canvasSize(canvasCmText(work.canvas, t.cm)),
          choice.frame === "none"
            ? null
            : t.framedSize(canvasCmText(framedCanvas(work.canvas, choice.frame), t.cm)),
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

  function cameraModel(current: FittingWork, version: string): ArCameraModel {
    const message = fittingMessage({
      works: [
        {
          title: current.title,
          choice,
          url: `${siteUrl}${roomPageUrl(current.id, choice, lang)}`,
        },
      ],
      place: "camera",
      t,
    });
    return {
      usdzUrl: arFileUrl(current.id, "model.usdz", version, choice),
      glbUrl: arFileUrl(current.id, "model.glb", version, choice),
      title: current.title,
      subtitle: sizeLine,
      contactUrl: whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
        : undefined,
    };
  }

  // Камеру телефона браузер открывает только из нажатия, поэтому её
  // запускает само нажатие — на кнопку или на «Понятно, открыть».
  function openCamera(): void {
    if (work === null || work.arVersion === null) return;
    const platform = arCamera.detect();
    const isPhone = platform === "ios" || platform === "android";
    if (isPhone && (!hasSeenArGuide() || isCarved)) {
      setIsGuideOpen(true);
      return;
    }
    arCamera.launch(platform, cameraModel(work, work.arVersion));
  }

  // Код для телефона рисует браузер, а не сервер: картину теперь меняют
  // прямо на странице, и сервер не знает, какая выбрана. В коде — и рама:
  // телефон откроет примерочную ровно с тем, что на экране. Пакет кода
  // грузится только на компьютере — на телефоне код не показывается.
  const phoneText =
    work !== null && work.arVersion !== null
      ? `${siteUrl}${roomPageUrl(work.id, choice, lang)}`
      : null;
  const [phoneCode, setPhoneCode] = useState<PhoneCode | null>(null);
  useEffect(() => {
    if (phoneText === null || !window.matchMedia("(pointer: fine)").matches) return;
    let isCurrent = true;
    void import("@/lib/qr").then(({ qrPath }) => {
      if (isCurrent) setPhoneCode({ text: phoneText, ...qrPath(phoneText) });
    });
    return () => {
      isCurrent = false;
    };
  }, [phoneText]);
  const qr = phoneCode?.text === phoneText ? phoneCode : null;

  // Фото стены. Файл выбирают в системном меню телефона — снять или из
  // галереи (решение 8: дальше браузера оно не уходит). Открытый редактор —
  // шаг в истории: жест «назад» возвращает к раме, а не уводит со страницы
  // вместе с развешенными картинами.
  const [wallFile, setWallFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Сколько элементов страницы сейчас под перетаскиваемым файлом. По
  // одному dragleave не понять, ушёл файл за окно или на соседний
  // элемент: проверка «покинули сам корень» пропускала уход за окно с
  // кнопки или текста, и подсветка залипала до следующего перетаскивания.
  const dragDepth = useRef(0);
  const photoInputId = useId();
  // Бросить фото стены можно, только когда картина выбрана и видна панель рам.
  const canDropPhoto = !isListOpen;

  function openWall(file: File | undefined): void {
    if (file === undefined || work === null) return;
    if (window.location.hash !== wallHash) {
      window.history.pushState(
        window.history.state,
        "",
        `${fittingUrl(entry, lang, work.id, choice)}${wallHash}`,
      );
    }
    setWallFile(file);
  }

  useEffect(() => {
    // Перезагрузили страницу с меткой — фото уже нет, метка лишняя.
    if (window.location.hash === wallHash) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
    const onBack = () => {
      if (window.location.hash !== wallHash) setWallFile(null);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  // Пока открыто фото стены, страница под ним не прокручивается.
  useEffect(() => {
    if (wallFile === null) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [wallFile]);

  function startFromGuide(): void {
    rememberArGuide();
    setIsGuideOpen(false);
    if (work !== null && work.arVersion !== null) {
      arCamera.launch(arCamera.detect(), cameraModel(work, work.arVersion));
    }
  }

  const workRatio = work === null ? 1 : work.canvas.width / work.canvas.height;

  return (
    <div
      className="fit"
      data-entry={entry}
      data-empty={work === null || undefined}
      data-picking={isListOpen || undefined}
      data-dragging={isDragging || undefined}
      // Фото можно перетащить в окно мышью — в любое место страницы.
      onDragEnter={(event) => {
        if (!canDropPhoto || !event.dataTransfer.types.includes("Files")) return;
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        if (canDropPhoto && event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (!canDropPhoto || !event.dataTransfer.types.includes("Files")) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setIsDragging(false);
        if (!canDropPhoto) return;
        const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
        openWall(file);
      }}
    >
      {/* Со страницы работы — своя полоса с «К работе»: шапки сайта здесь
          нет, как в полноэкранном просмотре. Из меню над примерочной
          обычная шапка (HangPage), а заголовок — в панели. */}
      {entry === "work" && work !== null && (
        <header className="fit-bar">
          <Link
            href={localePath(lang, `/gallery/${work.id}`)}
            className="fit-back"
            aria-label={t.back}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="arrow arrow-back size-5">
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
      )}

      <div className="fit-stage">
        {wallWork === null ? (
          // Пустая стена — гвоздик и место под картину: страница из меню
          // открывается до выбора. Подсказка — для глаз; скринридер идёт
          // по заголовку и списку в панели.
          <div className="fit-empty" aria-hidden="true">
            <span className="fit-empty-nail" />
            <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="fit-empty-wire">
              <path d="M100 0 4 40M100 0l96 40" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="fit-empty-frame">
              <span className="fit-empty-title">{t.emptyWall}</span>
              <span className="fit-empty-hint">{t.emptyWallHint}</span>
              <span className="fit-empty-pick">{t.pickWork}</span>
            </span>
          </div>
        ) : (
          <FramedPainting
            src={wallWork.src}
            alt={wallWork.alt}
            choice={choice}
            canvas={wallWork.canvas}
            sizes="(max-width: 1023px) 80vw, 50vw"
            // Картина на стене — главное на экране и тогда, когда её
            // повесили из списка уже в браузере: грузится первой.
            preload
          />
        )}
        {isListOpen && preview !== null && preview.id !== work?.id && (
          <p className="fit-preview" aria-hidden="true">
            {t.preview(preview.title)}
          </p>
        )}
      </div>

      <div className="fit-panel">
        {entry === "hang" && <h1 className="fit-heading">{t.heading}</h1>}

        <ol className="fit-steps" aria-label={t.steps}>
          <li aria-current={isListOpen ? "step" : undefined} data-done={!isListOpen || undefined}>
            <span className="fit-step-mark">
              {isListOpen ? (
                "1"
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[13px]">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {t.stepWork}
          </li>
          <li aria-current={isListOpen ? undefined : "step"}>
            <span className="fit-step-mark">2</span>
            {t.stepFrame}
          </li>
          <li>
            <span className="fit-step-mark">3</span>
            {t.stepWall}
          </li>
        </ol>

        {isListOpen ? (
          <WorkPicker
            works={feed}
            isFailed={isFeedFailed}
            current={work}
            frameLabel={t.frames[choice.frame].label}
            onPick={pick}
            onPreview={setPreview}
            onKeep={keepWork}
          />
        ) : (
          work !== null && (
            <>
              <div className="fit-work">
                <span className="fit-work-thumb">
                  <span
                    className="fit-work-art"
                    style={{
                      width: Math.round(workRatio >= 1 ? workThumbSide : workThumbSide * workRatio),
                      height: Math.round(
                        workRatio >= 1 ? workThumbSide / workRatio : workThumbSide,
                      ),
                    }}
                  >
                    <Image
                      src={work.src}
                      alt=""
                      fill
                      sizes={`${workThumbSide}px`}
                      className="object-cover"
                    />
                  </span>
                </span>
                <span className="fit-work-text">
                  <span className="fit-work-title">{work.title}</span>
                  <span className="fit-work-size">{sizeLine}</span>
                </span>
                <button
                  type="button"
                  className="fit-change"
                  aria-label={t.changeTitle}
                  onClick={() => setIsPicking(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                    <path
                      d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t.changeWork}
                </button>
              </div>

              <FramePicker choice={choice} onChange={choose} name="fit" />

              <div className="fit-actions">
                {work.arVersion !== null && (
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    className="fit-camera"
                    onClick={openCamera}
                  >
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
                {/* Подпись к полю выбора файла, а не кнопка: системное меню «снять
                    или выбрать» браузер открывает только по нажатию на само поле. */}
                <label className="btn btn-secondary btn-lg btn-block fit-photo">
                  {/* Подпись задана явно: у поля две подписи — эта кнопка и зона
                      перетаскивания ниже, — и скринридер склеил бы их текст. */}
                  <input
                    id={photoInputId}
                    type="file"
                    accept="image/*"
                    aria-label={t.photoWall}
                    className="sr-only"
                    onChange={(event) => {
                      openWall(event.target.files?.[0]);
                      // Тот же файл ещё раз — тоже выбор: без сброса поле промолчит.
                      event.target.value = "";
                    }}
                  />
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3.5" y="4.5" width="17" height="15" rx="1.8" />
                      <path d="m5.5 17 4.3-4.4 3 3 2.4-2.4 3.6 3.6" />
                      <circle cx="15.3" cy="9" r="1.5" />
                    </g>
                  </svg>
                  {t.photoWall}
                </label>
              </div>
              {/* Зона показывает, куда бросить фото, а по нажатию открывает тот же
                  выбор файла, что кнопка выше: пунктирная рамка выглядит полем,
                  и пустой клик по ней сбивал бы. Скринридеру и клавиатуре она не
                  нужна — для них есть кнопка. */}
              <label htmlFor={photoInputId} className="fit-drop" aria-hidden="true">
                <svg viewBox="10 2 28 24" className="fit-drop-icon">
                  <g className="fit-drop-photo">
                    <rect x="14" y="6" width="20" height="16" rx="2" />
                    <path d="m16.5 19.5 5-5 3.5 3.5 2.5-2.5 4 4" />
                    <circle cx="28.5" cy="11" r="1.7" />
                  </g>
                </svg>
                <span className="fit-drop-title">{isDragging ? t.dropRelease : t.dropPhoto}</span>
                <span className="fit-drop-pick">{t.dropPick}</span>
              </label>
              <p className="fit-note">{t.choiceNote}</p>

              {/* Камера — на телефоне; с компьютера к ней ведёт код (П-5).
                  Белое поле под кодом и в тёмном зале — без контраста камера
                  его не прочтёт. Пока код рисуется, место под ним держит
                  пустой квадрат — текст рядом не прыгает. */}
              {work.arVersion !== null && (
                <div className="fit-qr">
                  {qr === null ? (
                    <span className="fit-qr-code" aria-hidden="true" />
                  ) : (
                    <svg
                      viewBox={`0 0 ${qr.size} ${qr.size}`}
                      className="fit-qr-code"
                      role="img"
                      aria-label={t.qrLabel}
                      shapeRendering="crispEdges"
                    >
                      <rect width={qr.size} height={qr.size} fill="#ffffff" />
                      <path d={qr.path} fill="#111111" />
                    </svg>
                  )}
                  <p className="fit-qr-text">
                    <b>{t.qrTitle}</b>
                    {t.qrText}
                  </p>
                </div>
              )}

              {hint && (
                <p className="fit-hint" role="status">
                  {hint}
                </p>
              )}
            </>
          )
        )}
      </div>

      {work !== null && (
        <ArQuickLookLink
          linkRef={arCamera.linkRef}
          href={work.arVersion ? arFileUrl(work.id, "model.usdz", work.arVersion, choice) : "#"}
        />
      )}
      {wallFile !== null && work !== null && (
        <WallEditor
          file={wallFile}
          first={{
            work: {
              id: work.id,
              title: work.title,
              canvas: work.canvas,
              // Со своего адреса — иначе браузер не отдаст снимок (lib/ar-links.ts).
              photoUrl: work.arVersion ? wallPhotoUrl(work.id, work.arVersion) : work.src,
            },
            choice,
          }}
          siteUrl={siteUrl}
          whatsappPhone={whatsappPhone}
          onClose={() => window.history.back()}
        />
      )}
      {work !== null && (
        <ArGuide
          isOpen={isGuideOpen}
          photo={work.src}
          title={work.title}
          size={sizeLine}
          note={isCarved ? t.noCarving : undefined}
          onStart={startFromGuide}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </div>
  );
}
