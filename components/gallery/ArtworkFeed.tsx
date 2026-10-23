"use client";

import Link from "next/link";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";

import { ArtworkViewer } from "@/components/gallery/ArtworkViewer";
import { FeedThumbs } from "@/components/gallery/FeedThumbs";
import { WallLabel } from "@/components/gallery/WallLabel";
import { Arrow } from "@/components/ui/Arrow";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { tileAnchor } from "@/components/ui/ArtworkTile";
import { fetchArtworkFeed, positionOf } from "@/lib/artwork-thumbs";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath, type Locale } from "@/lib/i18n/config";

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
 * Значок примерки на табличке ведёт в примерочную этой картины
 * (TICKETS-primerka.md): рама, камера телефона и фото своей стены — там.
 */
export function ArtworkFeed({
  initial,
  siteUrl,
}: {
  /** Работа, ради которой открыли страницу, — с неё лента начинается. */
  initial: ArtworkFeedItem;
  siteUrl: string;
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

  // Адрес и заголовок вкладки — текущей картины. replaceState, а не
  // pushState: иначе «назад» шло бы через все пролистанные работы.
  //
  // Состояние — null, а не window.history.state. Next принимает вызов
  // за свой, если в состоянии его служебная пометка (__NA), и тогда не
  // передаёт новый адрес в usePathname: «← Все работы» и переключатель
  // языка в шапке вели к картине, с которой зашли, а не к текущей
  // (поймано 23.10.2026). Служебное состояние Next дописывает сам.
  useEffect(() => {
    const path = localePath(lang, `/gallery/${work.id}`);
    if (window.location.pathname === path) return;
    window.history.replaceState(null, "", path);
    document.title = `${work.pageTitle[lang]} · ${t.site.artist}`;
  }, [work, lang, t.site.artist]);

  // Один и тот же на все отрисовки: миниатюры под `memo` (FeedThumbs)
  // не перерисовываются из-за нового обработчика.
  const scrollToIndex = useCallback((index: number): void => {
    if (feedRef.current) scrollFeedTo(feedRef.current, index);
  }, []);

  // Номер считается только по самой ленте, без `current` и `works` из
  // замыкания: обработчики событий ниже вешаются один раз и живут дольше
  // одной отрисовки. Одинаковый номер React отбрасывает сам — лишней
  // отрисовки нет. Смена картины — не срочная (startTransition): React
  // считает её между кадрами, и движение ленты не замирает.
  function handleScroll(): void {
    const feed = feedRef.current;
    if (!feed) return;
    const index = indexOf(feed);
    startTransition(() => setCurrent(index));
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
  // а после шага лента «глуха», пока жест не утихнет на 250 мс. На краях
  // ленты колесо отпускается: подвала под ней с 23.10.2026 нет
  // (globals.css, .site-footer), держать колесо там незачем.
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
      {/* Размытая копия картины — фон тёмного зала, один на всю ленту, а не
          у каждой картины свой: прежде копия ехала вместе со своей картиной,
          и при листании весь фон сменялся, будто переключалась страница
          (заказчик, 23.10.2026). Теперь фон стоит на месте, а у новой
          картины мягко меняет оттенок — копии соседних лежат стопкой и
          проявляются по очереди. В светлом зале фона нет (CSS), и спрятанное
          ленивое фото не грузится. */}
      <div aria-hidden className="feed-backdrop">
        {works.map((item, index) =>
          Math.abs(index - current) <= nearby && item.src ? (
            <div
              key={item.id}
              data-shown={index === current || undefined}
              className="feed-backdrop-layer"
            >
              <ArtworkImage src={item.src} alt="" sizes={artSizes} />
            </div>
          ) : null,
        )}
      </div>

      <div ref={feedRef} onScroll={handleScroll} className="feed">
        {works.map((item, index) => {
          const isNear = Math.abs(index - current) <= nearby;
          return (
            <FeedSlide
              key={item.id}
              item={item}
              isMain={item.id === initial.id}
              isNear={isNear}
              isCurrent={index === current}
              // Соседи нужны только просмотру во весь экран, а он есть лишь
              // у ближних картин; дальним — null, чтобы их пропсы не менялись.
              prev={isNear ? (works[index - 1] ?? null) : null}
              next={isNear ? (works[index + 1] ?? null) : null}
              siteUrl={siteUrl}
              lang={lang}
            />
          );
        })}
      </div>

      {/* «← Все работы» и номер — наверху, в полосе шапки (заказчик,
          22.10.2026): снизу освободилось место, и миниатюры стали крупнее.
          На телефоне — слева от бургера, номер по центру; на компьютере,
          где шапка спрятана, — в левом верхнем углу над столбиком. */}
      <div className="feed-top">
        <Link href={galleryHref} className="feed-top-link">
          <Arrow dir="back" /> {t.work.backToAll}
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
    </>
  );
}

/**
 * Одна картина ленты с табличкой. Отдельным компонентом под `memo`: при
 * смене текущей картины перерисовываются только задетые — уходящая, новая
 * и соседи, — а не все двести. Прежде лента перерисовывала каждую на
 * каждом шаге, и посреди листания кадр зависал: на боевой сборке ~70 мс,
 * в режиме разработки ~200 мс — уходящая картина «зависала наверху»
 * (заказчик, 23.10.2026).
 */
const FeedSlide = memo(function FeedSlide({
  item,
  isMain,
  isNear,
  isCurrent,
  prev,
  next,
  siteUrl,
  lang,
}: {
  item: ArtworkFeedItem;
  isMain: boolean;
  isNear: boolean;
  isCurrent: boolean;
  prev: ArtworkFeedItem | null;
  next: ArtworkFeedItem | null;
  siteUrl: string;
  lang: Locale;
}) {
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
      aria-label={item.title}
      // По этой пометке CSS проявляет текущую картину и гасит
      // уходящую (globals.css, «Лента работ», анимация).
      data-current={isCurrent || undefined}
      style={style}
      className="feed-slide"
    >
      <div className="feed-work">
        <div className="feed-art">
          {isNear && item.src ? (
            <ArtworkViewer
              src={item.src}
              title={item.title}
              prev={prev}
              next={next}
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
          isCurrent={isCurrent}
          siteUrl={siteUrl}
        />
      </div>
    </section>
  );
});
