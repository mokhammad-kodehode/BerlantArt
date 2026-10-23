"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { ArQuickLookLink, useArCamera, type ArCameraModel } from "@/components/gallery/ArCamera";
import { ArGuide, hasSeenArGuide, rememberArGuide } from "@/components/gallery/ArGuide";
import { ArtworkViewer } from "@/components/gallery/ArtworkViewer";
import { FeedThumbs } from "@/components/gallery/FeedThumbs";
import { WallLabel } from "@/components/gallery/WallLabel";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { tileAnchor } from "@/components/ui/ArtworkTile";
import { arFileUrl } from "@/lib/ar-links";
import { fetchArtworkFeed, positionOf } from "@/lib/artwork-thumbs";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";
import { defaultRoomOptions, roomMessage } from "@/lib/room-options";

/**
 * Сколько картин по обе стороны от текущей получают «тяжёлое»: просмотр
 * во весь экран, меню «Поделиться», размытый фон тёмного зала и загрузку
 * фото заранее. Одной хватает: лента прилипает к каждой картине, дальше
 * соседней за один жест не уехать, а по миниатюре целевая сразу станет
 * текущей.
 */
const nearby = 1;

/**
 * Ширина картины в ленте для выбора копии фото: на компьютере холст не
 * шире ~56% окна (globals.css, .feed-art), на телефоне — во всю ширину.
 * Тот же `sizes` у размытого фона тёмного зала: файл скачивается один раз.
 */
const artSizes = "(min-width: 1024px) 56vw, 100vw";

/** Лента листается вниз на компьютере и вбок на телефоне — тот же порог, что в CSS. */
function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

/** Какая картина сейчас в ленте — по её прокрутке. */
function indexOf(feed: HTMLElement): number {
  const index = isDesktop()
    ? Math.round(feed.scrollTop / feed.clientHeight)
    : Math.round(feed.scrollLeft / feed.clientWidth);
  return Math.min(Math.max(index, 0), feed.children.length - 1);
}

/** Довести ленту до картины — плавно, если человек не просил меньше движения. */
function scrollFeedTo(feed: HTMLElement, index: number): void {
  const target = Math.min(Math.max(index, 0), feed.children.length - 1);
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = calm ? "auto" : "smooth";
  if (isDesktop()) feed.scrollTo({ top: target * feed.clientHeight, behavior });
  else feed.scrollTo({ left: target * feed.clientWidth, behavior });
}

/** Человек печатает — стрелки двигают курсор, а не листают картины. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

const forwardKeys = new Set(["ArrowDown", "ArrowRight", "PageDown"]);
const backKeys = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);

type SlideStyle = CSSProperties & { "--ratio": number };

/**
 * Картина в камере из ленты — без рамы: раму выбирали в примерочной,
 * а она скрыта до переделки (заказчик, 23.10.2026).
 */
const cameraFrame = { frame: defaultRoomOptions.frame, finish: defaultRoomOptions.finish };

/** Сколько держится подсказка под табличкой. */
const hintDuration = 6000;

/**
 * Лента работ на странице работы (заказчик, 22.10.2026, по макету
 * «Лента с табличкой»): картины одна за другой, каждая — на весь экран.
 * На компьютере листается колесом вниз, слева столбик миниатюр; на
 * телефоне — свайпом вбок, миниатюры полосой внизу. Прилипание к
 * картине и сам жест — браузерные (scroll-snap, globals.css «Лента
 * работ»): своего кода свайпа нет, и листание ведёт себя как привык
 * человек на своём устройстве.
 *
 * Адрес у каждой картины свой, как прежде. Сервер отдаёт страницу
 * одной работы — её картину и табличку видно сразу и поисковику, — а
 * остальные лента дорисовывает по общему списку `/api/artwork-thumbs`,
 * который браузер берёт один раз на посещение. Пока листаешь, адрес
 * и заголовок вкладки меняются на текущую картину (`replaceState`):
 * ссылкой можно поделиться, перезагрузка откроет ту же картину,
 * а «назад» ведёт туда, откуда пришли, а не через все пролистанные.
 *
 * Значок примерки на табличке сразу открывает камеру телефона с этой
 * картиной (заказчик, 23.10.2026): ссылка Quick Look и экран подготовки —
 * одни на всю ленту, модель выбирается в момент нажатия.
 */
export function ArtworkFeed({
  initial,
  siteUrl,
  whatsappPhone,
}: {
  /** Работа, ради которой открыли страницу, — с неё лента начинается. */
  initial: ArtworkFeedItem;
  siteUrl: string;
  /** Для кнопки «Написать о картине» внутри камеры; нет — нет и кнопки. */
  whatsappPhone?: string;
}) {
  const t = useDictionary();
  const lang = useLocale();
  const feedRef = useRef<HTMLDivElement>(null);
  const [works, setWorks] = useState<readonly ArtworkFeedItem[]>([initial]);
  const [current, setCurrent] = useState(0);
  // Куда поставить ленту до отрисовки, когда придёт список: перед
  // исходной картиной появятся все предыдущие, и без прыжка на экране
  // оказалась бы первая работа галереи.
  const jumpTo = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;
    fetchArtworkFeed()
      .then((list) => {
        const place = positionOf(list, initial.id);
        // Работы нет в списке (её только что удалили) — лента из неё одной.
        if (!isActive || place === null) return;
        jumpTo.current = place.position - 1;
        setWorks(list);
        setCurrent(place.position - 1);
      })
      .catch((error: unknown) => {
        // Без списка на странице остаётся одна эта картина: она цела,
        // листать просто нечего. Причина — в консоль, чтобы её найти.
        console.error(error);
      });
    return () => {
      isActive = false;
    };
  }, [initial.id]);

  useLayoutEffect(() => {
    const feed = feedRef.current;
    const index = jumpTo.current;
    if (!feed || index === null) return;
    jumpTo.current = null;
    if (isDesktop()) feed.scrollTop = index * feed.clientHeight;
    else feed.scrollLeft = index * feed.clientWidth;
  }, [works]);

  const work = works[current] ?? initial;

  // Подсказка под табличкой — у той картины, на которой нажали значок:
  // почему камера здесь не откроется. Android без сервисов AR возвращает
  // на страницу с меткой — тогда подсказка у картины, с которой ушли.
  const [hint, setHint] = useState<{ id: string; text: string } | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const noticeFor = useRef(initial.id);
  const showHint = useCallback((text: string) => {
    clearTimeout(hintTimer.current);
    setHint({ id: noticeFor.current, text });
    hintTimer.current = setTimeout(() => setHint(null), hintDuration);
  }, []);
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const arCamera = useArCamera(showHint);
  // Картина, для которой открыт экран подготовки к камере.
  const [guideWork, setGuideWork] = useState<ArtworkFeedItem | null>(null);

  function cameraModel(item: ArtworkFeedItem, version: string): ArCameraModel {
    const pageUrl = `${siteUrl}${localePath(lang, `/gallery/${item.id}`)}`;
    const message = roomMessage({
      title: item.title,
      options: defaultRoomOptions,
      pageUrl,
      place: "camera",
      t: t.room,
    });
    return {
      usdzUrl: arFileUrl(item.id, "model.usdz", version, cameraFrame),
      glbUrl: arFileUrl(item.id, "model.glb", version, cameraFrame),
      title: item.title,
      // Строка таблички — техника, размер, год: по размеру человек
      // сверяет картину со стеной.
      subtitle: item.label[lang],
      contactUrl: whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
        : undefined,
    };
  }

  // Экран подготовки — при первом открытии камеры на этом телефоне: без
  // него на iPhone было непонятно, почему картина полупрозрачная и куда
  // вести телефон. Камеру телефона браузер открывает только из нажатия,
  // поэтому её запускает само нажатие на значок или «Понятно, открыть».
  function tryOn(item: ArtworkFeedItem, version: string): void {
    noticeFor.current = item.id;
    const platform = arCamera.detect();
    if ((platform === "ios" || platform === "android") && !hasSeenArGuide()) {
      setGuideWork(item);
      return;
    }
    arCamera.launch(platform, cameraModel(item, version));
  }

  function startFromGuide(): void {
    rememberArGuide();
    const item = guideWork;
    setGuideWork(null);
    if (item?.arVersion) arCamera.launch(arCamera.detect(), cameraModel(item, item.arVersion));
  }

  // Адрес и заголовок вкладки — текущей картины. replaceState, а не
  // pushState: иначе «назад» шло бы через все пролистанные работы.
  // Next такой вызов понимает: переключатель языка в шапке и «назад»
  // знают новый адрес.
  useEffect(() => {
    const path = localePath(lang, `/gallery/${work.id}`);
    if (window.location.pathname === path) return;
    window.history.replaceState(window.history.state, "", path);
    document.title = `${work.pageTitle[lang]} · ${t.site.artist}`;
  }, [work, lang, t.site.artist]);

  function scrollToIndex(index: number): void {
    if (feedRef.current) scrollFeedTo(feedRef.current, index);
  }

  // Номер считается только по самой ленте, без `current` и `works` из
  // замыкания: обработчики событий ниже вешаются один раз и живут дольше
  // одной отрисовки. Одинаковый номер React отбрасывает сам — лишней
  // отрисовки нет.
  function handleScroll(): void {
    const feed = feedRef.current;
    if (feed) setCurrent(indexOf(feed));
  }

  // Стрелки и PageUp/PageDown листают картины, где бы ни стоял фокус.
  // Открытый просмотр ловит стрелки сам — тогда лента их не трогает.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const feed = feedRef.current;
      if (!feed || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTyping(event.target) || document.querySelector("dialog[open]")) return;
      const step = forwardKeys.has(event.key) ? 1 : backKeys.has(event.key) ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      scrollFeedTo(feed, indexOf(feed) + step);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Колесо мыши на компьютере — ровно одна картина за щелчок или жест.
  // Одного прилипания (scroll-snap) мало: щелчок колеса — 100–120px, и
  // браузер, прокрутив их, возвращал ленту к той же картине (так ведут
  // себя Firefox и Chrome без окна — проверено). Тачпад шлёт за жест
  // десятки мелких событий с хвостом инерции: они копятся до порога,
  // а после шага лента «глуха», пока жест не утихнет на 250 мс. Дальше
  // последней картины колесо отпускается — страница едет к подвалу.
  //
  // Вешается один раз: при перевешивании на каждой отрисовке (а лента
  // отрисовывается на каждую смену картины) пауза терялась посреди жеста,
  // и один жест тачпада пролистывал четыре картины — поймано проверкой.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let quietAt = 0;
    let travel = 0;

    function onWheel(event: WheelEvent): void {
      if (!feed || !isDesktop() || event.ctrlKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const from = indexOf(feed);
      const isPastEnd = event.deltaY > 0 && from === feed.children.length - 1;
      if (isPastEnd || (event.deltaY < 0 && from === 0)) return;

      event.preventDefault();
      const now = performance.now();
      if (now < quietAt) {
        quietAt = Math.max(quietAt, now + 250);
        return;
      }
      travel += event.deltaY;
      if (Math.abs(travel) < 40) return;
      scrollFeedTo(feed, from + Math.sign(travel));
      travel = 0;
      quietAt = now + 600;
    }

    feed.addEventListener("wheel", onWheel, { passive: false });
    return () => feed.removeEventListener("wheel", onWheel);
  }, []);

  // Назад в галерею — к плитке текущей картины, а не в начало стены.
  const galleryHref = `${localePath(lang, "/gallery")}#${tileAnchor(work.id)}`;

  return (
    <>
      <div ref={feedRef} onScroll={handleScroll} className="feed">
        {works.map((item, index) => {
          const isNear = Math.abs(index - current) <= nearby;
          const isMain = item.id === initial.id;
          const version = item.arVersion;
          const style: SlideStyle = { "--ratio": item.ratio ?? 1 };
          const art = (
            <ArtworkImage
              src={item.src}
              alt={item.alt[lang]}
              fit="contain"
              sizes={artSizes}
              priority={isMain}
              eager={isNear}
              loader
              aspect={item.ratio ?? undefined}
              className="feed-art-image"
            />
          );

          return (
            <section
              key={item.id}
              aria-label={item.title}
              // По этой пометке CSS проявляет текущую картину и гасит
              // уходящую (globals.css, «Лента работ», анимация).
              data-current={index === current || undefined}
              style={style}
              className="feed-slide"
            >
              {/* Размытая копия картины — фон тёмного зала; в светлом её
                  нет (CSS), и спрятанное ленивое фото не грузится. */}
              {isNear && item.src && (
                <div aria-hidden className="feed-backdrop">
                  <ArtworkImage src={item.src} alt="" sizes={artSizes} />
                </div>
              )}

              <div className="feed-work">
                <div className="feed-art">
                  {isNear && item.src ? (
                    <ArtworkViewer
                      src={item.src}
                      title={item.title}
                      prev={works[index - 1] ?? null}
                      next={works[index + 1] ?? null}
                      openOnHash={isMain}
                    >
                      {art}
                    </ArtworkViewer>
                  ) : (
                    art
                  )}
                </div>

                <WallLabel
                  work={item}
                  isMain={isMain}
                  isNear={isNear}
                  isCurrent={index === current}
                  siteUrl={siteUrl}
                  onTryOn={version ? () => tryOn(item, version) : undefined}
                  hint={hint?.id === item.id ? hint.text : null}
                />
              </div>
            </section>
          );
        })}
      </div>

      {/* «← Все работы» и номер — наверху, в полосе шапки (заказчик,
          22.10.2026): снизу освободилось место, и миниатюры стали крупнее.
          На телефоне — слева от бургера, номер по центру; на компьютере,
          где шапка спрятана, — в левом верхнем углу над столбиком. */}
      <div className="feed-top">
        <Link href={galleryHref} className="feed-top-link">
          {t.work.backToAll}
        </Link>
        {works.length > 1 && (
          <>
            <span aria-hidden className="feed-top-count">
              {current + 1} / {works.length}
            </span>
            <span className="sr-only">{t.work.position(current + 1, works.length)}</span>
          </>
        )}
      </div>

      {/* Миниатюры: на телефоне — полоса, прилипшая к низу экрана; на
          компьютере — столбик слева (globals.css, .feed-dock). */}
      <div className="feed-dock">
        <FeedThumbs works={works} current={current} onPick={scrollToIndex} />
      </div>

      <ArQuickLookLink
        linkRef={arCamera.linkRef}
        href={work.arVersion ? arFileUrl(work.id, "model.usdz", work.arVersion, cameraFrame) : "#"}
      />
      {guideWork?.src && (
        <ArGuide
          isOpen
          photo={guideWork.src}
          title={guideWork.title}
          size={guideWork.label[lang]}
          onStart={startFromGuide}
          onClose={() => setGuideWork(null)}
        />
      )}
    </>
  );
}
