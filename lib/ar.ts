import { createHash } from "node:crypto";

import sharp from "sharp";

import { buildPaintingScene, canvasPlacement, type CanvasPlacement } from "@/lib/ar-model";
import { imageUrl, type ArtworkWithImages } from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { buildGlb } from "@/lib/glb";
import { parseCanvasSides, type RoomOptions } from "@/lib/room-options";
import { buildUsdz } from "@/lib/usdz";

/**
 * Примерка через камеру телефона (AR-3, TICKETS-ar.md): можно ли показать
 * работу в камере, по какому адресу лежит её модель и как эта модель
 * собирается из фото.
 *
 * Модель собирается по запросу и кэшируется на CDN по адресу с версией
 * (решение 2). Версия — отпечаток всего, от чего зависит файл: главного
 * фото, размера холста и ревизии кода сборки. Правка в админке меняет
 * версию, а значит и адрес; старый кэш просто перестаёт быть нужен.
 */

/**
 * Ревизия сборки моделей. Поднять, если меняется то, что попадает в файл
 * (сечения рам, материалы, перекодирование фото): иначе телефоны ещё год
 * будут получать старую модель из кэша.
 */
const modelRevision = 1;

/** Форматы: USDZ — для iPhone (AR Quick Look), GLB — для Android (Scene Viewer). */
export const arFiles = {
  "model.usdz": "model/vnd.usdz+zip",
  "model.glb": "model/gltf-binary",
} as const;

export type ArFile = keyof typeof arFiles;

export function isArFile(name: string): name is ArFile {
  return Object.hasOwn(arFiles, name);
}

/** Что нужно для модели работы, если её можно показать в камере. */
export type ArTarget = {
  canvas: CanvasPlacement;
  /** Главное фото, как оно лежит в базе. */
  photo: string;
  version: string;
};

/**
 * Можно ли показать работу в камере (решение 6). Нельзя, если: работа
 * продана, размер холста не читается уверенно, нет фото или его размера,
 * форма фото расходится с размером холста. В каждом из этих случаев
 * покупатель увидел бы в камере ошибку или картину не того размера.
 */
export function arTarget(work: ArtworkWithImages): ArTarget | null {
  if (work.status === "SOLD") return null;

  const sides = parseCanvasSides(work.dimensions);
  // Выборка кладёт главное фото первым.
  const photo = work.images[0];
  if (sides === null || photo === undefined) return null;
  if (photo.width === null || photo.height === null) return null;

  const canvas = canvasPlacement(sides, { width: photo.width, height: photo.height });
  if (canvas === null) return null;

  const version = createHash("sha256")
    .update(JSON.stringify([modelRevision, photo.url, photo.width, photo.height, work.dimensions]))
    .digest("hex")
    .slice(0, 12);

  return { canvas, photo: photo.url, version };
}

/**
 * Адрес модели. Выбор рамы пишется всегда и в одном порядке: одинаковая
 * модель — один адрес, и CDN не хранит её копии под разными.
 */
export function arFileUrl(
  workId: string,
  file: ArFile,
  version: string,
  options: Pick<RoomOptions, "frame" | "finish">,
): string {
  const query = new URLSearchParams({ v: version, frame: options.frame, finish: options.finish });
  return `/gallery/${workId}/ar/${file}?${query}`;
}

/**
 * Фото внутрь модели. Телефоны берут внутрь JPEG и PNG, а не WebP,
 * в котором фото лежат в хранилище. 2048px по длинной стороне — предел
 * текстуры, который держат все телефоны с AR; больше — только вес.
 */
async function photoJpeg(photoUrl: URL): Promise<Uint8Array> {
  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Фото для модели не скачалось (${response.status}): ${photoUrl}`);
  }

  const jpeg = await sharp(new Uint8Array(await response.arrayBuffer()))
    .rotate()
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return new Uint8Array(jpeg);
}

/**
 * Файл модели.
 *
 * Старые фото лежат в public/ и скачиваются с самого сайта: у функции
 * на Vercel их нет на диске. Адрес сайта — из настроек, а не из запроса:
 * заголовок Host подделывается, и сервер скачал бы чужую картинку.
 */
export async function buildArFile({
  target,
  file,
  options,
}: {
  target: ArTarget;
  file: ArFile;
  options: Pick<RoomOptions, "frame" | "finish">;
}): Promise<Uint8Array<ArrayBuffer>> {
  const src = imageUrl(target.photo);
  if (src === undefined) {
    throw new Error("Не задан NEXT_PUBLIC_R2_PUBLIC_URL — фото для модели взять неоткуда.");
  }

  const scene = buildPaintingScene({ canvas: target.canvas, ...options });
  const jpeg = await photoJpeg(new URL(src, clientEnv.NEXT_PUBLIC_SITE_URL));

  return file === "model.usdz" ? buildUsdz(scene, jpeg) : buildGlb(scene, jpeg);
}
