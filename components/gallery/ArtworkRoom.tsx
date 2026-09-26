"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { PictureLamp } from "@/components/gallery/PictureLamp";
import { ContactIcon } from "@/components/ui/ContactIcon";
import {
  finishFor,
  frameFinish,
  frameModel,
  framedSides,
  roomFrames,
  roomLights,
  roomMessage,
  roomQuery,
  roomWalls,
  type CanvasSides,
  type RoomOptions,
} from "@/lib/room-options";
import { site } from "@/lib/site";

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

const roomTools: { id: RoomTool; label: string; icon: IconName }[] = [
  { id: "painting", label: "Картина", icon: "painting" },
  { id: "frame", label: "Рама", icon: "frame" },
  { id: "wall", label: "Стена", icon: "wall" },
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
  | "close";

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
 */
export function ArtworkRoom({
  work,
  works,
  initialOptions,
  whatsappPhone,
  siteUrl,
}: {
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
  whatsappPhone?: string;
  siteUrl: string;
}) {
  const pathname = usePathname();
  const [options, setOptions] = useState(initialOptions);
  const [aspect, setAspect] = useState<number | null>(null);
  const [isLampOn, setIsLampOn] = useState(false);
  const [isStripOpen, setIsStripOpen] = useState(false);
  // Открытый инструмент нижней строки на телефоне; null — ряд вариантов
  // закрыт и видна вся комната. На компьютере разделы панели видны все
  // сразу, и это состояние ни на что не влияет.
  const [tool, setTool] = useState<RoomTool | null>(null);
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
  const wallLabel = roomWalls.find((wall) => wall.id === options.wall)?.label ?? "";

  // Размеры для итога: холст и, если есть рама, — вместе с ней. Сколько
  // картина займёт на стене, покупатель и прикидывает, выбирая место.
  const orient = (value: CanvasSides) =>
    isLandscape ? `${value.long} × ${value.short} см` : `${value.short} × ${value.long} см`;
  const framed = sides === null ? null : framedSides(sides, options.frame);

  // «Издали» есть у каждой картины, а не только у картин с размером:
  // кнопка, которая то появляется, то нет, выглядит поломкой — на iPhone
  // заказчик решил, что она не поместилась. Без размера диван показать
  // честно нельзя, и кнопка говорит об этом словами.
  function toggleFarView() {
    if (sides === null) {
      clearTimeout(hintTimer.current);
      setHint("Размер картины не указан — показать её рядом с диваном нельзя");
      hintTimer.current = setTimeout(() => setHint(null), 3500);
      return;
    }
    update({ hasSofa: !options.hasSofa });
  }

  const toggleTool = (id: RoomTool) => setTool((current) => (current === id ? null : id));

  const query = roomQuery(options);
  const message = roomMessage(work.title, options, `${siteUrl}/gallery/${work.id}/room${query}`);

  return (
    <section
      className="room"
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
      aria-label={`Примерочная: «${work.title}»`}
    >
      <div className="room-bar flex items-center justify-between gap-3 px-[clamp(12px,4vw,48px)] pt-4 md:pt-6 lg:pr-[calc(var(--panel-w)+24px)]">
        {/* На телефоне — только стрелка: строка узкая, а подпись у ссылки
            остаётся для скринридера. */}
        <Link
          href={`/gallery/${work.id}`}
          className="room-pill text-[15px] max-lg:w-10 max-lg:justify-center max-lg:px-0"
          aria-label="К работе"
        >
          <span aria-hidden="true">←</span>
          <span className="max-lg:hidden">К работе</span>
        </Link>

        {/* Название и размер — на телефоне вместо таблички на стене. */}
        <p className="room-heading m-0 min-w-0 flex-1 text-center lg:hidden">
          <span className="block truncate text-[14px]">{work.title}</span>
          {sides !== null && <span className="block text-[12px] opacity-75">{orient(sides)}</span>}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            className="room-pill text-[15px] max-lg:hidden"
            aria-expanded={isStripOpen}
            aria-controls="room-strip"
            onClick={() => setIsStripOpen((value) => !value)}
          >
            Другая картина
          </button>

          <button
            type="button"
            className="room-pill w-10 justify-center px-0 lg:hidden"
            aria-expanded={isInfoOpen}
            aria-controls="room-info"
            aria-label="О картине"
            onClick={() => setIsInfoOpen((value) => !value)}
          >
            <ViewIcon name="info" />
          </button>

          {/* На компьютере эта кнопка — главная, внизу боковой панели;
              здесь она только на телефоне, где боковой панели нет. */}
          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="room-pill w-10 justify-center px-0 text-[15px] lg:hidden"
              aria-label="Написать о картине в WhatsApp"
            >
              <ContactIcon id="whatsapp" className="size-[18px]" />
            </a>
          )}
        </div>
      </div>

      {isInfoOpen && (
        <div id="room-info" className="room-info" role="dialog" aria-label="О картине">
          <button
            type="button"
            className="room-info-close"
            aria-label="Закрыть"
            onClick={() => setIsInfoOpen(false)}
          >
            <ViewIcon name="close" />
          </button>
          <p className="room-info-title">{work.title}</p>
          <p className="m-0 text-[14px]">{site.artist}</p>
          {work.details && <p className="mt-1 mb-0 text-[13px] opacity-75">{work.details}</p>}
          {sides !== null && (
            <dl className="room-sizes mt-3">
              <dt>Холст</dt>
              <dd>{orient(sides)}</dd>
              {framed !== null && options.frame !== "none" && (
                <>
                  <dt>В раме</dt>
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
              {site.artist}
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
          Настройки
        </button>
      )}

      {(isStripOpen || tool === "painting") && (
        <div className="room-strip-wrap">
          <ul id="room-strip" className="room-strip" aria-label="Другие работы">
            {works.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/gallery/${item.id}/room${query}`}
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
        aria-label="Настройки примерочной"
        // Убранная панель недоступна и для клавиатуры: inert не пускает
        // в неё фокус, иначе Tab уводил бы в невидимые кнопки.
        inert={!isPanelOpen}
      >
        <button
          type="button"
          className="room-panel-close"
          aria-controls="room-panel"
          aria-expanded={isPanelOpen}
          aria-label="Скрыть настройки"
          title="Скрыть настройки"
          onClick={() => setIsPanelOpen(false)}
        >
          <ViewIcon name="collapse" />
        </button>

        <header className="room-panel-head">
          <p className="room-kicker">Примерочная</p>
          <h1 className="room-panel-title">{work.title}</h1>
        </header>

        {/*
          Вид — первым разделом, над рамами. Прежде день, вечер и «издали»
          были прозрачными кнопками на самой сцене и на коричневом полу
          почти не читались (заказчик). В панели они на тёмном фоне и видны
          при любой стене. На телефоне этого раздела нет: там те же кнопки
          в нижней строке инструментов.
        */}
        <section className="room-section max-lg:hidden">
          <h2 className="room-section-title" id="room-view-title">
            <span className="room-section-name">Вид</span>
            <span className="room-section-value">
              {options.light === "evening" ? "Вечер, лампа" : "День"}
              {isSofaShown ? " · издали" : ""}
            </span>
          </h2>
          <div className="room-seg" role="radiogroup" aria-labelledby="room-view-title">
            {roomLights.map((light) => (
              <label key={light.id}>
                <input
                  type="radio"
                  name="room-light"
                  value={light.id}
                  checked={options.light === light.id}
                  onChange={() => update({ light: light.id })}
                />
                <ViewIcon name={light.id === "day" ? "sun" : "moon"} />
                {light.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="room-far"
            aria-pressed={isSofaShown}
            onClick={toggleFarView}
          >
            <ViewIcon name={isSofaShown ? "zoom-in" : "zoom-out"} />
            {isSofaShown ? "Вернуться к картине" : "Посмотреть издали, рядом с диваном"}
          </button>
        </section>

        <section className="room-section" data-active={tool === "frame"}>
          <h2 className="room-section-title" id="room-frame-title">
            <span className="room-section-name">Рама</span>
            <span className="room-section-value">
              {options.frame === "none"
                ? model.label
                : `${model.label}, ${model.widthCm} см · ${finish.label}`}
            </span>
          </h2>
          <div className="room-models" role="radiogroup" aria-labelledby="room-frame-title">
            {roomFrames.map((frame) => (
              <label
                key={frame.id}
                className="room-model"
                title={frame.id === "none" ? frame.note : `${frame.note}`}
              >
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
                <span className="room-model-name">{frame.label}</span>
                <span className="room-model-meta">
                  {frame.widthCm === 0 ? "холст" : `${frame.widthCm} см`}
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
                Цвет рамы
              </p>
              <div className="room-swatches" role="radiogroup" aria-labelledby="room-finish-title">
                {model.finishes.map((id) => {
                  const item = frameFinish(id);
                  return (
                    <label
                      key={id}
                      title={item.label}
                      className="room-swatch room-swatch-finish"
                      data-finish={id}
                    >
                      <input
                        type="radio"
                        name="room-finish"
                        value={id}
                        aria-label={item.label}
                        checked={options.finish === id}
                        onChange={() => update({ finish: id })}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="room-section" data-active={tool === "wall"}>
          <h2 className="room-section-title" id="room-wall-title">
            <span className="room-section-name">Стена</span>
            <span className="room-section-value">{wallLabel}</span>
          </h2>
          <div className="room-swatches" role="radiogroup" aria-labelledby="room-wall-title">
            {roomWalls.map((wall) => (
              <label
                key={wall.id}
                title={wall.label}
                className="room-swatch"
                style={{ background: `var(--wall-${wall.id})` }}
              >
                <input
                  type="radio"
                  name="room-wall"
                  value={wall.id}
                  aria-label={wall.label}
                  checked={options.wall === wall.id}
                  onChange={() => update({ wall: wall.id })}
                />
              </label>
            ))}
          </div>
        </section>

        <footer className="room-summary">
          {sides !== null && (
            <dl className="room-sizes">
              <dt>Холст</dt>
              <dd>{orient(sides)}</dd>
              {framed !== null && options.frame !== "none" && (
                <>
                  <dt>В раме</dt>
                  <dd>{orient(framed)}</dd>
                </>
              )}
            </dl>
          )}

          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="room-cta"
            >
              <ContactIcon id="whatsapp" className="size-5" />
              Написать о картине
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
      <nav className="room-toolbar" aria-label="Примерочная">
        {roomTools.map((item) => (
          <button
            key={item.id}
            type="button"
            className="room-tool"
            aria-pressed={tool === item.id}
            onClick={() => toggleTool(item.id)}
          >
            <ViewIcon name={item.icon} className="size-[22px]" />
            {item.label}
          </button>
        ))}

        <button
          type="button"
          className="room-tool"
          aria-pressed={options.light === "evening"}
          aria-label={options.light === "evening" ? "Вечер, включить день" : "День, включить вечер"}
          onClick={() => update({ light: options.light === "evening" ? "day" : "evening" })}
        >
          <ViewIcon name={options.light === "evening" ? "moon" : "sun"} className="size-[22px]" />
          {options.light === "evening" ? "Вечер" : "День"}
        </button>

        <button
          type="button"
          className="room-tool"
          aria-pressed={isSofaShown}
          aria-label={isSofaShown ? "Ближе к картине" : "Посмотреть издали, с диваном 210 см"}
          onClick={toggleFarView}
        >
          <ViewIcon name={isSofaShown ? "zoom-in" : "zoom-out"} className="size-[22px]" />
          {isSofaShown ? "Ближе" : "Издали"}
        </button>
      </nav>

      {/* Лицензия CC BY 4.0 требует указать, что модель создана в Meshy.
          Подпись видна, только когда диван в кадре: без дивана она ни к чему. */}
      {isSofaShown && (
        <p className="room-credit">
          Диван — 3D-модель, создана в{" "}
          <a href="https://www.meshy.ai" target="_blank" rel="noopener noreferrer">
            Meshy
          </a>{" "}
          · CC BY 4.0
        </p>
      )}

      {/* role="status" — скринридер зачитает подсказку, не сбивая фокус. */}
      <p className="room-hint" role="status">
        {hint}
      </p>
    </section>
  );
}
