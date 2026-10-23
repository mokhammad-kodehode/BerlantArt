"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { FramePicker } from "@/components/gallery/FramePicker";
import { AddWorkSheet } from "@/components/gallery/wall/AddWorkSheet";
import { MeasureLayer } from "@/components/gallery/wall/MeasureLayer";
import { WallHelp } from "@/components/gallery/wall/WallHelp";
import { Arrow } from "@/components/ui/Arrow";
import { Button } from "@/components/ui/Button";
import { roomPageUrl } from "@/lib/ar-links";
import { framedSize, type PaintingImage } from "@/lib/frame-canvas";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { fittingMessage, type FrameChoice } from "@/lib/room-options";
import {
  applyHomography,
  frontalWall,
  isConvexClockwise,
  wallFromCorners,
  type Point,
  type Quad,
  type WallPlane,
} from "@/lib/wall-plane";
import {
  drawWallScene,
  itemAt,
  itemCorners,
  loadPaintingImage,
  loadWallPhoto,
  wallSnapshot,
  type WallItem,
  type WallView,
  type WallWork,
} from "@/lib/wall-scene";
import { fitView } from "@/lib/wall-zoom";

/** Чем мерили стену. */
type Reference = "a4" | "door" | "custom";

/**
 * Шаги: что за мерка и её размер, углы мерки на фото, редактор, готовый
 * снимок. Мерка — в два шага (заказчик, 23.10.2026, макет «Мерка: фото
 * крупнее»): пока выбор и кружки стояли на одном экране, панель
 * занимала больше половины, и фото сжималось до трети.
 */
type Step = "reference" | "corners" | "edit" | "done";

/** Лист А4 — его размер вписывать не нужно, он у всех один. */
const a4 = { width: 21, height: 29.7 };

/** Межкомнатная дверь обычно 80 × 200 — с этого поля и начинаются. */
const doorDefault = { width: "80", height: "200" };

/** Сколько стены «на глаз» помещается в ширину фото — с этого начинается ползунок, см. */
const eyeballWallCm = 250;

/** Промежуток между картинами, когда их вешают рядом, см. */
const hangGap = 20;

/** Ширина рамки в сантиметрах из поля: «29,7» тоже число. */
function parseCm(text: string): number | null {
  const value = Number(text.replace(",", ".").trim());
  return Number.isFinite(value) && value > 0 && value < 2000 ? value : null;
}

/** Мерка по умолчанию — посередине фото, в пропорциях того, чем мерят. */
function startCorners(photo: PaintingImage, aspect: number): Quad {
  const height = Math.min(photo.height * 0.45, (photo.width * 0.3) / aspect);
  const width = height * aspect;
  const x = (photo.width - width) / 2;
  const y = (photo.height - height) / 2;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/** Картины в ряд, серединами на одной линии, вокруг точки `center`. */
function arrange(items: readonly WallItem[], center: Point): WallItem[] {
  const widths = items.map((item) => framedSize(item.work.canvas, item.choice).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + hangGap * (items.length - 1);
  let x = center.x - total / 2;
  return items.map((item, index) => {
    const at = { x: x + widths[index] / 2, y: center.y };
    x += widths[index] + hangGap;
    return { ...item, at };
  });
}

/**
 * Фото своей стены (TICKETS-primerka.md, П-2–П-4): мерка по четырём углам,
 * картины на стене в настоящем размере, у каждой — своя рама, и готовый
 * снимок.
 *
 * Фото не покидает браузер (решение 8). Всё рисует canvas
 * (lib/wall-scene.ts): что на экране, то и на снимке.
 *
 * Модуль грузится, только когда человек выбрал фото (FittingRoom):
 * экрану «Картина и рама» он не нужен.
 */
export function WallEditor({
  file: initialFile,
  first,
  siteUrl,
  whatsappPhone,
  onClose,
}: {
  file: File;
  /** Картина, с которой пришли, и её рама с экрана «Картина и рама». */
  first: { work: WallWork; choice: FrameChoice };
  siteUrl: string;
  whatsappPhone?: string;
  onClose: () => void;
}) {
  const t = useDictionary().room;
  const lang = useLocale();

  const [file, setFile] = useState(initialFile);
  const [photo, setPhoto] = useState<PaintingImage | null>(null);
  const [isPhotoBroken, setIsPhotoBroken] = useState(false);

  const [step, setStep] = useState<Step>("reference");
  const [reference, setReference] = useState<Reference>("a4");
  const [doorSize, setDoorSize] = useState(doorDefault);
  const [customSize, setCustomSize] = useState({ width: "", height: "" });
  const [corners, setCorners] = useState<Quad | null>(null);
  const [isTouched, setIsTouched] = useState(false);
  const [measureError, setMeasureError] = useState<string | null>(null);

  // Стена — по мерке или «на глаз» (тогда масштаб — ползунком).
  const [plane, setPlane] = useState<WallPlane | null>(null);
  const [planeBy, setPlaneBy] = useState<Reference | "eye">("a4");
  const [eyeScale, setEyeScale] = useState(1);

  const [items, setItems] = useState<WallItem[]>([
    { key: `${first.work.id}-0`, work: first.work, choice: first.choice, at: { x: 0, y: 0 } },
  ]);
  const [selected, setSelected] = useState<string | null>(`${first.work.id}-0`);
  const [isFramePickerOpen, setIsFramePickerOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const counter = useRef(1);

  const [images, setImages] = useState<ReadonlyMap<string, PaintingImage>>(new Map());
  const loading = useRef(new Set<string>());

  const [snapshot, setSnapshot] = useState<Blob | null>(null);
  const [snapshotError, setSnapshotError] = useState(false);
  // Отдать файл в меню телефона умеют не все браузеры: на компьютере
  // чаще — нет, тогда остаётся «Сохранить». Модуль грузится только в
  // браузере (FittingRoom), поэтому navigator здесь есть всегда.
  const [canShareFiles] = useState(
    () =>
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }),
  );

  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Увеличенное фото на шаге углов — вместе с тем, для какого фото и окна
  // оно посчитано: повернули телефон или сменили фото — снова целиком.
  const [zoomed, setZoomed] = useState<{
    view: WallView;
    photo: PaintingImage;
    size: { width: number; height: number };
  } | null>(null);
  const [hasZoomed, setHasZoomed] = useState(false);

  // Фото стены: читаем файл здесь, в браузере.
  useEffect(() => {
    let isActive = true;
    loadWallPhoto(file)
      .then((loaded) => {
        if (!isActive) return;
        setPhoto(loaded);
        setIsPhotoBroken(false);
      })
      .catch((error: unknown) => {
        // HEIC на компьютере, битый файл — браузер не раскодировал. Говорим
        // словами, причину — в консоль.
        console.error(error);
        if (isActive) setIsPhotoBroken(true);
      });
    return () => {
      isActive = false;
    };
  }, [file]);

  // Мерка встаёт посередине нового фото — пока её не трогали руками.
  const aspect =
    reference === "a4"
      ? a4.width / a4.height
      : reference === "door"
        ? (parseCm(doorSize.width) ?? 80) / (parseCm(doorSize.height) ?? 200)
        : (parseCm(customSize.width) ?? 1) / (parseCm(customSize.height) ?? 1);
  const shownCorners = corners ?? (photo === null ? null : startCorners(photo, aspect));

  // Фото картин — по одному разу на адрес.
  useEffect(() => {
    for (const item of items) {
      const url = item.work.photoUrl;
      if (loading.current.has(url)) continue;
      loading.current.add(url);
      loadPaintingImage(url)
        .then((image) => setImages((current) => new Map(current).set(url, image)))
        .catch((error: unknown) => {
          // Не скачалось — на стене тёмный холст на месте фото; можно убрать.
          console.error(error);
        });
    }
  }, [items]);

  // Размер окна под фото: фото вписывается в него целиком.
  useEffect(() => {
    const element = stage.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitted = useMemo<WallView | null>(
    () => (photo === null || size.width === 0 || size.height === 0 ? null : fitView(photo, size)),
    [photo, size],
  );
  const view =
    step === "corners" && zoomed !== null && zoomed.photo === photo && zoomed.size === size
      ? zoomed.view
      : fitted;

  const changeView = useCallback(
    (next: WallView | null) => {
      if (photo === null) return;
      setZoomed(next === null ? null : { view: next, photo, size });
      if (next !== null) setHasZoomed(true);
    },
    [photo, size],
  );

  // Стена «на глаз»: масштаб от середины фото.
  const eyePlane = useMemo(
    () =>
      photo === null
        ? null
        : frontalWall((photo.width / eyeballWallCm) * eyeScale, {
            x: photo.width / 2,
            y: photo.height / 2,
          }),
    [photo, eyeScale],
  );
  const wall = planeBy === "eye" ? eyePlane : plane;

  // Рисуем: фото, картины, обводка выбранной.
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx || photo === null || view === null) return;

    const ratio = window.devicePixelRatio || 1;
    element.width = Math.round(size.width * ratio);
    element.height = Math.round(size.height * ratio);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, element.width, element.height);

    if (step === "reference" || step === "corners" || wall === null) {
      ctx.setTransform(
        view.scale * ratio,
        0,
        0,
        view.scale * ratio,
        view.x * ratio,
        view.y * ratio,
      );
      ctx.drawImage(photo.source, 0, 0, photo.width, photo.height);
      return;
    }

    drawWallScene(ctx, { photo, plane: wall, items, images, view, pixelRatio: ratio });

    const current = items.find((item) => item.key === selected);
    if (step !== "edit" || current === undefined) return;
    const outline = itemCorners(wall, current).map((p) => ({
      x: (view.x + p.x * view.scale) * ratio,
      y: (view.y + p.y * view.scale) * ratio,
    }));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    outline.forEach((p, index) => (index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    // Пунктир белым по тёмной подложке — виден и на светлой стене, и на тёмной.
    ctx.setLineDash([6 * ratio, 4 * ratio]);
    ctx.strokeStyle = "rgb(0 0 0 / 0.35)";
    ctx.lineWidth = 4 * ratio;
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * ratio;
    ctx.stroke();
  }, [photo, view, size, step, wall, items, images, selected]);

  function chooseReference(next: Reference): void {
    setReference(next);
    setMeasureError(null);
    // Нетронутая мерка меняет пропорции вместе с тем, чем мерят.
    if (!isTouched) setCorners(null);
  }

  function referenceSize(): { width: number; height: number } | null {
    if (reference === "a4") return a4;
    const source = reference === "door" ? doorSize : customSize;
    const width = parseCm(source.width);
    const height = parseCm(source.height);
    return width === null || height === null ? null : { width, height };
  }

  // Шаг 1 → 2: размер мерки проверяется здесь, на углах его уже не поправить.
  function markCorners(): void {
    if (referenceSize() === null) {
      setMeasureError(t.wall.badSize);
      return;
    }
    setMeasureError(null);
    setStep("corners");
  }

  // Назад с углов — к выбору мерки: кружки остаются там, где их поставили.
  function backToReference(): void {
    setMeasureError(null);
    setZoomed(null);
    setStep("reference");
  }

  function finishMeasure(): void {
    if (photo === null || shownCorners === null) return;
    const real = referenceSize();
    if (real === null) {
      setMeasureError(t.wall.badSize);
      return;
    }
    const measured = isConvexClockwise(shownCorners) ? wallFromCorners(shownCorners, real) : null;
    if (measured === null) {
      setMeasureError(t.wall.badCorners);
      return;
    }
    setPlane(measured);
    setPlaneBy(reference);
    // Картины — на месте листа или своего прямоугольника: его вешают туда,
    // где хотят картину. Дверь — не место для картины: тогда середина фото.
    const center =
      reference === "door"
        ? applyHomography(measured.toWall, { x: photo.width / 2, y: photo.height / 2 })
        : { x: real.width / 2, y: real.height / 2 };
    setItems((current) => arrange(current, center));
    setZoomed(null);
    setStep("edit");
  }

  function skipMeasure(): void {
    setPlaneBy("eye");
    setEyeScale(1);
    setItems((current) => arrange(current, { x: 0, y: 0 }));
    setStep("edit");
  }

  // — перетаскивание картин —
  const dragging = useRef<{ key: string; grab: Point } | null>(null);

  function wallPoint(event: ReactPointerEvent): Point | null {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect || view === null || wall === null) return null;
    const photoPoint = {
      x: (event.clientX - rect.left - view.x) / view.scale,
      y: (event.clientY - rect.top - view.y) / view.scale,
    };
    return applyHomography(wall.toWall, photoPoint);
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (step !== "edit" || wall === null || view === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const key = itemAt(wall, items, {
      x: (event.clientX - rect.left - view.x) / view.scale,
      y: (event.clientY - rect.top - view.y) / view.scale,
    });
    if (key === null) {
      setSelected(null);
      setIsFramePickerOpen(false);
      return;
    }
    const point = wallPoint(event);
    const item = items.find((candidate) => candidate.key === key);
    if (point === null || item === undefined) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { key, grab: { x: point.x - item.at.x, y: point.y - item.at.y } };
    setSelected(key);
    // Выбранная — поверх остальных.
    setItems((current) => [...current.filter((c) => c.key !== key), item]);
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const current = dragging.current;
    if (current === null) return;
    const point = wallPoint(event);
    if (point === null) return;
    setHasMoved(true);
    setItems((list) =>
      list.map((item) =>
        item.key === current.key
          ? { ...item, at: { x: point.x - current.grab.x, y: point.y - current.grab.y } }
          : item,
      ),
    );
  }

  function pointerUp(): void {
    dragging.current = null;
  }

  // С клавиатуры: стрелки двигают выбранную на сантиметр, с Shift — на десять.
  function keyDown(event: ReactKeyboardEvent<HTMLCanvasElement>): void {
    if (step !== "edit" || selected === null) return;
    const arrows: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = arrows[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const by = event.shiftKey ? 10 : 1;
    setItems((list) =>
      list.map((item) =>
        item.key === selected
          ? { ...item, at: { x: item.at.x + delta.x * by, y: item.at.y + delta.y * by } }
          : item,
      ),
    );
  }

  // Новая картина — справа от последней, если там есть фото; иначе слева
  // от первой; не влезает и там — посередине снимка.
  function placeFor(work: WallWork, choice: FrameChoice): Point {
    const width = framedSize(work.canvas, choice).width;
    const last = items.at(-1);
    const head = items[0];
    if (wall === null || photo === null || last === undefined || head === undefined) {
      return { x: 0, y: 0 };
    }
    const onPhoto = (at: Point): boolean => {
      const left = applyHomography(wall.toPhoto, { x: at.x - width / 2, y: at.y }).x;
      const right = applyHomography(wall.toPhoto, { x: at.x + width / 2, y: at.y }).x;
      return left >= 0 && right <= photo.width;
    };
    const right = {
      x: last.at.x + framedSize(last.work.canvas, last.choice).width / 2 + hangGap + width / 2,
      y: last.at.y,
    };
    if (onPhoto(right)) return right;
    const left = {
      x: head.at.x - framedSize(head.work.canvas, head.choice).width / 2 - hangGap - width / 2,
      y: head.at.y,
    };
    if (onPhoto(left)) return left;
    return applyHomography(wall.toWall, { x: photo.width / 2, y: photo.height / 2 });
  }

  function addWork(work: WallWork): void {
    const choice: FrameChoice = { frame: "none", finish: "gold" };
    const at = placeFor(work, choice);
    const key = `${work.id}-${counter.current}`;
    counter.current += 1;
    setItems((list) => [...list, { key, work, choice, at }]);
    setSelected(key);
    setIsAdding(false);
  }

  function removeSelected(): void {
    setItems((list) => list.filter((item) => item.key !== selected));
    setSelected(null);
    setIsFramePickerOpen(false);
  }

  function changeFrame(choice: FrameChoice): void {
    setItems((list) => list.map((item) => (item.key === selected ? { ...item, choice } : item)));
  }

  function changePhoto(next: File | undefined): void {
    if (next === undefined) return;
    setFile(next);
    setPhoto(null);
    setCorners(null);
    setIsTouched(false);
    setZoomed(null);
    setStep("reference");
  }

  async function finish(): Promise<void> {
    if (photo === null || wall === null) return;
    setSnapshotError(false);
    try {
      setSnapshot(await wallSnapshot({ photo, plane: wall, items, images }));
      setStep("done");
    } catch (error) {
      // Чаще всего — картина с чужого адреса, и браузер не отдаёт снимок.
      console.error(error);
      setSnapshotError(true);
    }
  }

  function save(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = t.wall.fileName;
    link.click();
    // Ссылка нужна браузеру, пока он начинает скачивание; минута — с запасом.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function share(blob: Blob): Promise<void> {
    const shared = new File([blob], t.wall.fileName, { type: "image/jpeg" });
    try {
      await navigator.share({ files: [shared], title: t.wall.title });
    } catch (error) {
      // Закрыли меню — это не ошибка. Остальное — в консоль, снимок можно сохранить.
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    }
  }

  const message = fittingMessage({
    works: items.map((item) => ({
      title: item.work.title,
      choice: item.choice,
      url: `${siteUrl}${roomPageUrl(item.work.id, item.choice, lang)}`,
    })),
    place: "photo",
    t,
  });
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
    : undefined;

  const current = items.find((item) => item.key === selected);
  const measured = referenceSize();
  const referenceSummary = [
    reference === "a4" ? t.wall.refA4 : reference === "door" ? t.wall.refDoor : t.wall.refCustom,
    measured === null
      ? null
      : `${measured.width.toLocaleString(lang)} × ${measured.height.toLocaleString(lang)} ${t.cm}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const subtitle =
    step === "reference"
      ? t.wall.stepMeasure
      : step === "corners"
        ? t.wall.stepCorners
        : planeBy === "eye"
          ? t.wall.byEye
          : planeBy === "door"
            ? t.wall.byDoor
            : planeBy === "custom"
              ? t.wall.byCustom
              : t.wall.byA4;

  return (
    <div className="wall" data-step={step}>
      <header className="fit-bar wall-bar">
        {/* С шага углов «назад» — к выбору мерки, а не к раме: так
            меняют лист на дверь, не теряя фото (заказчик, 23.10.2026). */}
        <button
          type="button"
          className="fit-back"
          onClick={step === "corners" ? backToReference : onClose}
          aria-label={step === "corners" ? t.wall.backToMeasure : t.wall.back}
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
          <span className="fit-back-text">
            {step === "corners" ? t.wall.backToMeasure : t.wall.back}
          </span>
        </button>
        <h1 className="fit-title">
          <span className="fit-title-main">{t.wall.title}</span>
          <span className="fit-title-work">{subtitle}</span>
        </h1>
        <WallHelp />
      </header>

      <div ref={stage} className="wall-stage">
        <canvas
          ref={canvas}
          className="wall-canvas"
          role="img"
          aria-label={t.wall.stageLabel(items.length)}
          tabIndex={step === "edit" ? 0 : -1}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onKeyDown={keyDown}
        />
        {step === "corners" && shownCorners !== null && view !== null && photo !== null && (
          <>
            <MeasureLayer
              corners={shownCorners}
              view={view}
              box={size}
              photo={photo}
              label={t.wall.measureHint}
              zoomLabel={t.wall.zoomReset}
              onView={changeView}
              onChange={(next) => {
                setCorners(next);
                setIsTouched(true);
                setMeasureError(null);
              }}
            />
            <p className="wall-bubble">{t.wall.measureHint}</p>
            {/* Как увеличить — пока не увеличивали ни разу. Пальцами или
                колесом — по тому, чем человек показывает (globals.css). */}
            {!hasZoomed && (
              <p className="wall-bubble wall-bubble-low">
                <span className="wall-zoom-touch">{t.wall.zoomTouch}</span>
                <span className="wall-zoom-mouse">{t.wall.zoomMouse}</span>
              </p>
            )}
          </>
        )}
        {step === "edit" && !hasMoved && items.length > 0 && (
          <p className="wall-bubble">{t.wall.drag}</p>
        )}
        {isPhotoBroken && <p className="wall-bubble">{t.wall.photoError}</p>}
      </div>

      <div className="wall-panel">
        {step === "reference" && (
          <>
            <h2 className="wall-panel-title">{t.wall.measureTitle}</h2>
            <p className="wall-panel-text">{t.wall.measureText}</p>
            <div className="wall-refs" role="radiogroup" aria-label={t.wall.measureTitle}>
              {(["a4", "door", "custom"] as const).map((kind) => (
                <label key={kind} className="wall-ref">
                  <input
                    type="radio"
                    name="wall-ref"
                    value={kind}
                    checked={reference === kind}
                    onChange={() => chooseReference(kind)}
                  />
                  <span>
                    {kind === "a4"
                      ? t.wall.refA4
                      : kind === "door"
                        ? t.wall.refDoor
                        : t.wall.refCustom}
                  </span>
                </label>
              ))}
            </div>
            {reference !== "a4" && (
              <div className="wall-size">
                {(["width", "height"] as const).map((side) => {
                  const source = reference === "door" ? doorSize : customSize;
                  const update = reference === "door" ? setDoorSize : setCustomSize;
                  return (
                    <label key={side} className="wall-size-field">
                      <span>{side === "width" ? t.wall.width : t.wall.height}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={source[side]}
                        onChange={(event) => {
                          update({ ...source, [side]: event.target.value });
                          setMeasureError(null);
                          if (!isTouched) setCorners(null);
                        }}
                      />
                      <span>{t.cm}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {measureError && (
              <p className="wall-error" role="alert">
                {measureError}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              block
              onClick={markCorners}
              disabled={photo === null}
            >
              {reference === "a4"
                ? t.wall.markA4
                : reference === "door"
                  ? t.wall.markDoor
                  : t.wall.markCustom}{" "}
              <Arrow />
            </Button>
            <button
              type="button"
              className="wall-link"
              onClick={skipMeasure}
              disabled={photo === null}
            >
              {t.wall.eyeball}
            </button>
          </>
        )}

        {/* Шаг 2: на телефоне — тонкая полоса, чтобы фото досталось почти
            всё место; что за мерка — нажать и поменять. */}
        {step === "corners" && (
          <>
            <div className="wall-corners">
              <button
                type="button"
                className="wall-corners-ref"
                onClick={backToReference}
                aria-label={`${t.wall.changeMeasure}: ${referenceSummary}`}
              >
                <span>{referenceSummary}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 3 3L8 18.5zM13.5 7l3 3" />
                </svg>
              </button>
              <Button variant="primary" size="lg" onClick={finishMeasure}>
                {t.wall.measureDone}
              </Button>
            </div>
            {measureError && (
              <p className="wall-error" role="alert">
                {measureError}
              </p>
            )}
          </>
        )}

        {step === "edit" && (
          <>
            {planeBy === "eye" && (
              <label className="wall-scale">
                <span>{t.wall.scale}</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={Math.log2(eyeScale) / 1.4}
                  // Ползунок по степени двойки: от трети до втрое — шаг одинаков на глаз.
                  onChange={(event) => setEyeScale(2 ** (Number(event.target.value) * 1.4))}
                />
              </label>
            )}
            <div className="wall-tools">
              <button
                type="button"
                className="wall-tool"
                aria-pressed={isFramePickerOpen}
                disabled={current === undefined}
                onClick={() => setIsFramePickerOpen((open) => !open)}
              >
                <ToolIcon name="frame" />
                {t.wall.toolFrame}
              </button>
              <button type="button" className="wall-tool" onClick={() => setIsAdding(true)}>
                <ToolIcon name="add" />
                {t.wall.toolAdd}
              </button>
              <button type="button" className="wall-tool" onClick={() => setStep("reference")}>
                <ToolIcon name="measure" />
                {t.wall.toolMeasure}
              </button>
              <label className="wall-tool">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => changePhoto(event.target.files?.[0])}
                />
                <ToolIcon name="photo" />
                {t.wall.toolPhoto}
              </label>
              <button
                type="button"
                className="wall-tool"
                disabled={current === undefined}
                onClick={removeSelected}
              >
                <ToolIcon name="remove" />
                {t.wall.toolRemove}
              </button>
            </div>
            {isFramePickerOpen && current !== undefined && (
              <div className="wall-frame">
                <p className="wall-frame-for">{t.wall.frameFor(current.work.title)}</p>
                <FramePicker choice={current.choice} onChange={changeFrame} name="wall" />
              </div>
            )}
            {snapshotError && (
              <p className="wall-error" role="alert">
                {t.wall.snapshotError}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              block
              onClick={finish}
              disabled={items.length === 0}
            >
              {t.wall.done}
            </Button>
          </>
        )}

        {step === "done" && snapshot !== null && (
          <>
            <h2 className="wall-panel-title">{t.wall.doneTitle}</h2>
            <p className="wall-panel-text">{t.wall.doneText}</p>
            {canShareFiles && (
              <Button variant="primary" size="lg" block onClick={() => share(snapshot)}>
                {t.wall.share}
              </Button>
            )}
            <Button
              variant={canShareFiles ? "soft" : "primary"}
              size="lg"
              block
              onClick={() => save(snapshot)}
            >
              {t.wall.save}
            </Button>
            {whatsappUrl && (
              <a
                className="btn btn-secondary btn-lg btn-block"
                href={whatsappUrl}
                target="_blank"
                rel="noopener"
              >
                {t.wall.write}
              </a>
            )}
            <button type="button" className="wall-link" onClick={() => setStep("edit")}>
              {t.wall.edit}
            </button>
          </>
        )}
      </div>

      {isAdding && (
        <AddWorkSheet
          onWall={new Set(items.map((item) => item.work.id))}
          onPick={addWork}
          onClose={() => setIsAdding(false)}
        />
      )}
    </div>
  );
}

/** Значки инструментов редактора — линией, цвет от текста, как значки табличек. */
function ToolIcon({ name }: { name: "frame" | "add" | "measure" | "photo" | "remove" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "frame" && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
          <rect x="7.5" y="7.5" width="9" height="9" />
        </>
      )}
      {name === "add" && <path d="M12 5v14M5 12h14" />}
      {name === "measure" && <path d="M3 12h18M6.5 8.5 3 12l3.5 3.5M17.5 8.5 21 12l-3.5 3.5" />}
      {name === "photo" && (
        <>
          <rect x="3.5" y="5.5" width="13" height="11" rx="1.5" />
          <path d="M8 19.5h11.5V9" />
        </>
      )}
      {name === "remove" && <path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" />}
    </svg>
  );
}
