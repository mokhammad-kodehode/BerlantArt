import { allowedTypes, isAllowedType, maxFileBytes, maxLongSide } from "@/lib/upload-limits";

/**
 * Пережатие фотографии в браузере перед заливкой (Э5-2).
 *
 * Здесь, а не на сервере: файл идёт из браузера прямо в хранилище и через
 * наш сервер не проходит. Пережимать на сервере значило бы скачать объект,
 * обработать и залить обратно. Заодно заливка ускоряется: по мобильному
 * интернету уходит 600 КБ, а не 4 МБ.
 *
 * Модуль только для браузера — `createImageBitmap` и `<canvas>`. Серверных
 * импортов в нём нет и быть не должно. Подбор размера и качества вынесен
 * в чистые функции: их проверяют тесты без всякого браузера.
 */

export type Size = { width: number; height: number };

/** Сжатие одной картинки под заданные размер и качество. */
export type Encode = (size: Size, quality: number) => Promise<Blob>;

/**
 * Ступени качества. 85% — на нём потери на живописи глазом не видны;
 * ниже 75% не спускаемся: на плотной фактуре появляются пятна, и
 * честнее уменьшить картинку, чем испортить её.
 */
export const qualitySteps = [0.85, 0.8, 0.75] as const;

/** Во сколько раз уменьшается сторона, если ни одна ступень не влезла. */
const shrinkFactor = 0.85;

/** Сколько раз уменьшать, прежде чем сдаться: 0.85⁴ ≈ 0.52 от 2500px. */
const maxShrinks = 4;

/**
 * Вписывает размер в квадрат `maxSide`, сохраняя пропорции. Маленький
 * снимок не растягивается: из 600px 2500 не сделать, будет только мыло
 * и лишний вес.
 */
export function fitWithin(size: Size, maxSide: number): Size {
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));

  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * Подбирает качество, а если не помогло — размер, пока файл не влезет
 * в лимит. Возвращает первый подошедший вариант, то есть самый качественный
 * из подходящих.
 */
export async function encodeWithinLimit(
  original: Size,
  encode: Encode,
  limit = maxFileBytes,
): Promise<Blob> {
  let size = fitWithin(original, maxLongSide);

  for (let shrink = 0; shrink <= maxShrinks; shrink++) {
    // По очереди, а не через Promise.all: нужен первый подошедший, а каждое
    // сжатие большой картинки занимает процессор телефона на полсекунды.
    for (const quality of qualitySteps) {
      const blob = await encode(size, quality);
      if (blob.size <= limit) return blob;
    }

    size = {
      width: Math.max(1, Math.round(size.width * shrinkFactor)),
      height: Math.max(1, Math.round(size.height * shrinkFactor)),
    };
  }

  throw new Error("Фото не удалось ужать до допустимого веса. Попробуйте другой снимок.");
}

/**
 * Во что сжимать: WebP, если браузер умеет, иначе JPEG.
 *
 * Проверяется делом, а не по названию браузера: Safari на просьбу о WebP
 * молча отдаёт PNG, и узнать это можно, только посмотрев на результат.
 * Посетителю формат исходника безразличен — сайт всё равно отдаёт ему
 * WebP через оптимизатор `next/image`.
 */
let outputType: Promise<"image/webp" | "image/jpeg"> | undefined;

function pickOutputType(): Promise<"image/webp" | "image/jpeg"> {
  outputType ??= new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob(
      (blob) => resolve(blob?.type === "image/webp" ? "image/webp" : "image/jpeg"),
      "image/webp",
    );
  });

  return outputType;
}

/** Рисует картинку в нужном размере и сжимает. */
function drawAndEncode(
  bitmap: ImageBitmap,
  type: "image/webp" | "image/jpeg",
  size: Size,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Браузер не дал нарисовать картинку.");

  // У JPEG нет прозрачности: без заливки прозрачные места PNG стали бы
  // чёрными, а не белыми.
  if (type === "image/jpeg") {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size.width, size.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error("Не удалось сжать фото.")) : resolve(blob)),
      type,
      quality,
    );
  });
}

/**
 * Готовит снимок к заливке: не больше 2500px по длинной стороне, WebP
 * (или JPEG, где WebP не кодируется), не тяжелее 1 МБ.
 *
 * Побочно и к лучшему:
 * - поворот из EXIF применяется при чтении — фото с телефона не ляжет боком;
 * - метаданные, включая координаты места съёмки, в новый файл не попадают;
 * - цвета при чтении переводятся в sRGB, поэтому снимок в Adobe RGB
 *   не поедет по цвету, хотя профиль в файл не записывается.
 */
export async function prepareImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Причина браузера («InvalidStateError») человеку ничего не скажет,
    // а бывает она от одного: файл не открывается как картинка.
    throw new Error(`Не удалось открыть «${file.name}» как изображение.`);
  }

  try {
    const type = await pickOutputType();
    const blob = await encodeWithinLimit(
      { width: bitmap.width, height: bitmap.height },
      (size, q) => drawAndEncode(bitmap, type, size, q),
    );

    if (!isAllowedType(blob.type)) throw new Error("Браузер сжал фото в неожиданный формат.");

    const baseName = file.name.replace(/\.[^.]*$/, "") || "photo";
    return new File([blob], `${baseName}.${allowedTypes[blob.type]}`, { type: blob.type });
  } finally {
    // Разжатый снимок 4000×3000 держит в памяти ~48 МБ — отпускаем сразу,
    // не дожидаясь сборщика мусора: на телефоне это заметно.
    bitmap.close();
  }
}
