import { drawFramedPainting, framedSize, type PaintingImage } from "@/lib/frame-canvas";
import type { CanvasCm, FrameChoice } from "@/lib/room-options";
import {
  applyAffine,
  applyHomography,
  localAffine,
  type Point,
  type Quad,
  type WallPlane,
} from "@/lib/wall-plane";

/**
 * Фото своей стены с картинами на нём (TICKETS-primerka.md, П-3 и П-4):
 * что висит, где и как это нарисовать — на экране и в готовом снимке
 * одним и тем же кодом. Только для браузера.
 */

/** Картина, которую можно повесить: холст в сантиметрах и фото со своего адреса. */
export type WallWork = { id: string; title: string; canvas: CanvasCm; photoUrl: string };

/** Картина на стене: где её середина (сантиметры стены) и в какой раме. */
export type WallItem = { key: string; work: WallWork; choice: FrameChoice; at: Point };

/** Как фото вписано в окно: масштаб и сдвиг, в точках CSS. */
export type WallView = { scale: number; x: number; y: number };

/** Самое длинное фото стены, точек. Больше — только память телефона: снимок всё равно 2000px. */
export const maxPhotoSide = 2000;

/**
 * Фото стены из файла — уменьшенное до `maxPhotoSide`. Поворот по EXIF
 * браузер делает сам, когда рисует картинку. Фото не покидает браузер
 * (решение 8): файл читается здесь же и нигде не хранится.
 */
export async function loadWallPhoto(file: File): Promise<PaintingImage> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const ratio = Math.min(1, maxPhotoSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * ratio);
    const height = Math.round(image.naturalHeight * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("Браузер не дал canvas для фото стены.");
    ctx.drawImage(image, 0, 0, width, height);
    return { source: canvas, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Фото картины по адресу. */
export async function loadPaintingImage(url: string): Promise<PaintingImage> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return { source: image, width: image.naturalWidth, height: image.naturalHeight };
}

/** Четыре угла картины в раме на фото — для обводки выбранной и попадания пальцем. */
export function itemCorners(plane: WallPlane, item: WallItem): Quad {
  const t = localAffine(plane, item.at);
  const { width, height } = framedSize(item.work.canvas, item.choice);
  const [hw, hh] = [width / 2, height / 2];
  return [
    applyAffine(t, { x: -hw, y: -hh }),
    applyAffine(t, { x: hw, y: -hh }),
    applyAffine(t, { x: hw, y: hh }),
    applyAffine(t, { x: -hw, y: hh }),
  ];
}

/**
 * Какая картина под точкой фото — верхняя из тех, что там висят. Проверка
 * в сантиметрах стены: там картина — ровный прямоугольник при любом
 * наклоне фото.
 */
export function itemAt(plane: WallPlane, items: readonly WallItem[], photo: Point): string | null {
  const point = applyHomography(plane.toWall, photo);
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const { width, height } = framedSize(item.work.canvas, item.choice);
    if (Math.abs(point.x - item.at.x) <= width / 2 && Math.abs(point.y - item.at.y) <= height / 2) {
      return item.key;
    }
  }
  return null;
}

/**
 * Сцена: фото стены, на нём картины в рамах с тенью. `view` — как фото
 * вписано в canvas (в точках CSS), `pixelRatio` — плотность экрана.
 * Для снимка: view = { scale: 1, x: 0, y: 0 }, pixelRatio = 1.
 */
export function drawWallScene(
  ctx: CanvasRenderingContext2D,
  {
    photo,
    plane,
    items,
    images,
    view,
    pixelRatio,
  }: {
    photo: PaintingImage;
    plane: WallPlane;
    items: readonly WallItem[];
    images: ReadonlyMap<string, PaintingImage>;
    view: WallView;
    pixelRatio: number;
  },
): void {
  const k = view.scale * pixelRatio;
  ctx.setTransform(k, 0, 0, k, view.x * pixelRatio, view.y * pixelRatio);
  ctx.drawImage(photo.source, 0, 0, photo.width, photo.height);

  for (const item of items) {
    const t = localAffine(plane, item.at);
    const transform = (): void =>
      ctx.setTransform(
        k * t.a,
        k * t.b,
        k * t.c,
        k * t.d,
        (view.x + view.scale * t.e) * pixelRatio,
        (view.y + view.scale * t.f) * pixelRatio,
      );
    // Точек экрана на сантиметр — размытие тени задаётся в них, а не в сантиметрах.
    const pxPerCm = k * Math.sqrt(Math.abs(t.a * t.d - t.b * t.c));
    const { width, height } = framedSize(item.work.canvas, item.choice);

    // Тень на стене: свет сверху, тень вниз — как у картин в ленте.
    ctx.save();
    transform();
    ctx.shadowColor = "rgb(25 15 5 / 0.38)";
    ctx.shadowBlur = 2.4 * pxPerCm;
    ctx.shadowOffsetY = 1.2 * pxPerCm;
    ctx.fillStyle = "#141210";
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.restore();

    ctx.save();
    transform();
    drawFramedPainting(ctx, {
      image: images.get(item.work.photoUrl) ?? null,
      canvas: item.work.canvas,
      choice: item.choice,
    });
    ctx.restore();
  }
}

/**
 * Готовый снимок: фото в своём размере (до `maxPhotoSide`) и картины.
 * JPEG: фотография в PNG весила бы в разы больше.
 */
export async function wallSnapshot(scene: {
  photo: PaintingImage;
  plane: WallPlane;
  items: readonly WallItem[];
  images: ReadonlyMap<string, PaintingImage>;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = scene.photo.width;
  canvas.height = scene.photo.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Браузер не дал canvas для снимка.");
  drawWallScene(ctx, { ...scene, view: { scale: 1, x: 0, y: 0 }, pixelRatio: 1 });

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error("Снимок не собрался.")) : resolve(blob)),
      "image/jpeg",
      0.9,
    ),
  );
}
