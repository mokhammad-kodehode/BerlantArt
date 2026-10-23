import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { PaintingImage } from "@/lib/frame-canvas";
import type { Point, Quad } from "@/lib/wall-plane";
import type { WallView } from "@/lib/wall-scene";

/** Лупа: диаметр в точках CSS и во сколько раз крупнее фото на экране. */
const loupeSize = 120;
const loupeZoom = 3;

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
 * Углы хранятся в точках фото, а не экрана: мерка не съезжает, когда
 * телефон поворачивают и фото вписывается заново.
 */
export function MeasureLayer({
  corners,
  view,
  photo,
  onChange,
  label,
}: {
  corners: Quad;
  view: WallView;
  photo: PaintingImage;
  onChange: (corners: Quad) => void;
  /** Подпись для скринридера: что это за кружки. */
  label: string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const loupe = useRef<HTMLCanvasElement>(null);
  // Что тянем: номер угла или всю мерку, и откуда начали.
  const drag = useRef<{ corner: number | "all"; start: Point; from: Quad } | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const toScreen = (p: Point): Point => ({
    x: view.x + p.x * view.scale,
    y: view.y + p.y * view.scale,
  });
  const toPhoto = (event: ReactPointerEvent): Point => {
    const rect = layer.current?.getBoundingClientRect();
    return {
      x: (event.clientX - (rect?.left ?? 0) - view.x) / view.scale,
      y: (event.clientY - (rect?.top ?? 0) - view.y) / view.scale,
    };
  };

  function start(event: ReactPointerEvent<Element>, corner: number | "all"): void {
    event.preventDefault();
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

  const screen = corners.map(toScreen);
  const polygon = screen.map((p) => `${p.x},${p.y}`).join(" ");
  const anchor = active === null ? null : screen[active];

  return (
    <div ref={layer} className="measure-layer" role="group" aria-label={label}>
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
    </div>
  );
}
