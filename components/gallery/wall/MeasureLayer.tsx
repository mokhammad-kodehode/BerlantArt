import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { PaintingImage } from "@/lib/frame-canvas";
import type { Point, Quad } from "@/lib/wall-plane";
import type { WallView } from "@/lib/wall-scene";
import { clampView, zoomOf, zoomView } from "@/lib/wall-zoom";

/** Лупа: диаметр в точках CSS и во сколько раз крупнее фото на экране. */
const loupeSize = 120;
const loupeZoom = 3;

/** Мини-карта увеличенного фото: ширина в точках CSS. */
const mapWidth = 64;

/** Двойное касание: второе — не позже, чем через столько мс, и не дальше, чем на столько точек. */
const doubleTapMs = 300;
const doubleTapSlop = 24;

/** Во сколько раз увеличивает двойное касание. */
const tapZoom = 2.5;

/** С какого увеличения фото считается увеличенным: тогда один палец его двигает. */
const zoomedFrom = 1.05;

const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Мерка поверх фото стены (TICKETS-primerka.md, П-2): четыре кружка
 * в углах прямоугольника, который человек знает по размеру, — листа А4,
 * двери. Кружок тянется пальцем или мышью; всю мерку можно сдвинуть,
 * потянув за середину.
 *
 * Пока тянут угол, над пальцем — лупа: лист А4 на фото комнаты — это
 * пара сантиметров экрана, и палец закрывает тот самый угол, в который
 * надо попасть. Так делают все приложения с разметкой по фото.
 *
 * Фото увеличивается (заказчик, 23.10.2026): двумя пальцами — крупнее и
 * сдвинуть, двойное касание — увеличить в этом месте или вернуть,
 * колесо мыши — крупнее у курсора. Увеличенное фото двигает и один
 * палец — кроме кружков: при увеличении мерка обычно больше экрана, и
 * «сдвинуть всю мерку» мешало бы рассматривать фото. Вид меняет
 * редактор (`onView`), здесь — только жесты; счёт — lib/wall-zoom.ts.
 *
 * Углы хранятся в точках фото, а не экрана: мерка не съезжает, когда
 * телефон поворачивают или фото увеличивают.
 */
export function MeasureLayer({
  corners,
  view,
  box,
  photo,
  onChange,
  onView,
  label,
  zoomLabel,
}: {
  corners: Quad;
  /** Как фото сейчас лежит в окне — с увеличением. */
  view: WallView;
  /** Размер окна под фото. */
  box: { width: number; height: number };
  photo: PaintingImage;
  onChange: (corners: Quad) => void;
  /** Новый вид фото; `null` — снова целиком в окне. */
  onView: (view: WallView | null) => void;
  /** Подпись для скринридера: что это за кружки. */
  label: string;
  /** Подпись кнопки «1×» — вернуть фото целиком. */
  zoomLabel: string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const loupe = useRef<HTMLCanvasElement>(null);
  const map = useRef<HTMLCanvasElement>(null);
  // Что тянем: номер угла или всю мерку, и откуда начали.
  const drag = useRef<{ corner: number | "all"; start: Point; from: Quad } | null>(null);
  const [active, setActive] = useState<number | null>(null);

  // Жесты фото: пальцы на экране, увеличение двумя и сдвиг одним.
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ from: WallView; mid: Point; spread: number } | null>(null);
  const pan = useRef<{ from: WallView; start: Point } | null>(null);
  const lastTap = useRef<{ at: Point; time: number } | null>(null);

  const zoom = zoomOf(view, photo, box);
  const isZoomed = zoom > zoomedFrom;

  const toScreen = (p: Point): Point => ({
    x: view.x + p.x * view.scale,
    y: view.y + p.y * view.scale,
  });
  const local = (event: { clientX: number; clientY: number }): Point => {
    const rect = layer.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };
  const toPhoto = (event: ReactPointerEvent): Point => {
    const at = local(event);
    return { x: (at.x - view.x) / view.scale, y: (at.y - view.y) / view.scale };
  };

  function start(event: ReactPointerEvent<Element>, corner: number | "all"): void {
    event.preventDefault();
    // Увеличенное фото один палец двигает — мерку целиком не тащим.
    if (corner === "all" && isZoomed) return;
    // Второй палец — это увеличение, а не новый кружок.
    if (pointers.current.size > 1) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { corner, start: toPhoto(event), from: corners };
    setActive(corner === "all" ? null : corner);
  }

  function move(event: ReactPointerEvent): void {
    const current = drag.current;
    if (current === null) return;
    const point = toPhoto(event);
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    const moved = current.from.map((corner, index) =>
      current.corner === "all" || current.corner === index
        ? { x: corner.x + dx, y: corner.y + dy }
        : corner,
    );
    onChange([moved[0], moved[1], moved[2], moved[3]]);
  }

  function end(): void {
    drag.current = null;
    setActive(null);
  }

  // Все пальцы — в фазе перехвата: так их видно, даже когда палец
  // попал в кружок или в мерку и событие забрали они.
  function fingerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size !== 2) return;
    // Второй палец: что бы ни тянули первым, теперь — увеличение.
    end();
    pan.current = null;
    const [a, b] = [...pointers.current.values()];
    pinch.current = { from: view, mid: middle(a, b), spread: distance(a, b) };
  }

  function fingerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, local(event));
    const gesture = pinch.current;
    if (gesture !== null && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const mid = middle(a, b);
      onView(
        zoomView(
          gesture.from,
          {
            at: gesture.mid,
            factor: distance(a, b) / Math.max(gesture.spread, 1),
            pan: { x: mid.x - gesture.mid.x, y: mid.y - gesture.mid.y },
          },
          photo,
          box,
        ),
      );
      return;
    }
    const dragging = pan.current;
    if (dragging === null) return;
    const at = local(event);
    onView(
      clampView(
        {
          ...dragging.from,
          x: dragging.from.x + at.x - dragging.start.x,
          y: dragging.from.y + at.y - dragging.start.y,
        },
        photo,
        box,
      ),
    );
  }

  function fingerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) pan.current = null;
  }

  // Палец мимо кружков: двойное касание увеличивает или возвращает,
  // а увеличенное фото одним пальцем двигается.
  function backgroundDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (pointers.current.size > 1 || drag.current !== null) return;
    const at = local(event);
    const now = performance.now();
    const tap = lastTap.current;
    if (tap !== null && now - tap.time < doubleTapMs && distance(tap.at, at) < doubleTapSlop) {
      lastTap.current = null;
      onView(isZoomed ? null : zoomView(view, { at, factor: tapZoom }, photo, box));
      return;
    }
    lastTap.current = { at, time: now };
    if (!isZoomed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pan.current = { from: view, start: at };
  }

  // Колесо мыши (и щипок на тачпаде — он приходит колесом с Ctrl):
  // крупнее у курсора. Обработчик свой, не React: только он может
  // отменить прокрутку страницы и увеличение всей страницы браузером.
  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    function onWheel(event: WheelEvent): void {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
      onView(zoomView(view, { at: local(event), factor }, photo, box));
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [view, photo, box, onView]);

  // Лупа: кусок фото вокруг угла, крупнее, с перекрестьем и краями мерки.
  useEffect(() => {
    const element = loupe.current;
    const ctx = element?.getContext("2d");
    if (active === null || !element || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = loupeSize * ratio;
    element.height = loupeSize * ratio;

    const center = corners[active];
    const k = view.scale * loupeZoom * ratio;
    const half = (loupeSize / 2) * ratio;
    ctx.setTransform(k, 0, 0, k, half - center.x * k, half - center.y * k);
    ctx.fillStyle = "#1b1714";
    ctx.fillRect(center.x - half / k, center.y - half / k, (2 * half) / k, (2 * half) / k);
    ctx.drawImage(photo.source, 0, 0, photo.width, photo.height);

    // Края мерки — в точках лупы, а не в масштабе фото: линия не толстеет.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 1.5 * ratio;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    corners.forEach((p, index) => {
      const x = half + (p.x - center.x) * k;
      const y = half + (p.y - center.y) * k;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Перекрестье — точка, куда встанет угол.
    ctx.strokeStyle = "rgb(0 0 0 / 0.7)";
    ctx.lineWidth = 3 * ratio;
    ctx.beginPath();
    ctx.moveTo(half - 12 * ratio, half);
    ctx.lineTo(half + 12 * ratio, half);
    ctx.moveTo(half, half - 12 * ratio);
    ctx.lineTo(half, half + 12 * ratio);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5 * ratio;
    ctx.stroke();
  }, [active, corners, view, photo]);

  // Мини-карта: всё фото и рамка — какая его часть сейчас на экране.
  const mapHeight = Math.round((mapWidth * photo.height) / photo.width);
  useEffect(() => {
    const element = map.current;
    const ctx = element?.getContext("2d");
    if (!isZoomed || !element || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = mapWidth * ratio;
    element.height = mapHeight * ratio;
    const k = (mapWidth * ratio) / photo.width;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.drawImage(photo.source, 0, 0, photo.width, photo.height);
    ctx.fillStyle = "rgb(0 0 0 / 0.4)";
    ctx.fillRect(0, 0, photo.width, photo.height);
    const x = Math.max(0, -view.x / view.scale);
    const y = Math.max(0, -view.y / view.scale);
    const width = Math.min(photo.width - x, box.width / view.scale);
    const height = Math.min(photo.height - y, box.height / view.scale);
    ctx.drawImage(photo.source, x, y, width, height, x, y, width, height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5 * ratio;
    ctx.strokeRect(x * k, y * k, width * k, height * k);
  }, [isZoomed, view, photo, box, mapHeight]);

  const screen = corners.map(toScreen);
  const polygon = screen.map((p) => `${p.x},${p.y}`).join(" ");
  const anchor = active === null ? null : screen[active];

  return (
    <div
      ref={layer}
      className="measure-layer"
      role="group"
      aria-label={label}
      data-zoomed={isZoomed || undefined}
      onPointerDownCapture={fingerDown}
      onPointerMoveCapture={fingerMove}
      onPointerUpCapture={fingerUp}
      onPointerCancelCapture={fingerUp}
      onPointerDown={backgroundDown}
    >
      <svg className="measure-shape" aria-hidden="true">
        <polygon
          points={polygon}
          onPointerDown={(event) => start(event, "all")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </svg>
      {screen.map((p, index) => (
        <span
          // Порядок углов постоянный — номер и есть имя.
          key={index}
          className="measure-handle"
          data-active={index === active || undefined}
          style={{ left: p.x, top: p.y }}
          onPointerDown={(event) => start(event, index)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      ))}
      {anchor !== null && (
        <canvas
          ref={loupe}
          aria-hidden="true"
          className="measure-loupe"
          style={{
            left: anchor.x - loupeSize / 2,
            // Над пальцем; у верхнего края — под ним.
            top: anchor.y > loupeSize + 40 ? anchor.y - loupeSize - 36 : anchor.y + 36,
            width: loupeSize,
            height: loupeSize,
          }}
        />
      )}
      {isZoomed && (
        <>
          <canvas
            ref={map}
            aria-hidden="true"
            className="measure-map"
            style={{ width: mapWidth, height: mapHeight }}
          />
          <button
            type="button"
            className="measure-zoom"
            aria-label={zoomLabel}
            title={zoomLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onView(null)}
          >
            {zoom.toLocaleString(undefined, { maximumFractionDigits: 1 })}×<span>1×</span>
          </button>
        </>
      )}
    </div>
  );
}
