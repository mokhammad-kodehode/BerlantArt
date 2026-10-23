import sharp from "sharp";

import type { ArFile } from "@/lib/ar-links";
import { buildPaintingScene } from "@/lib/ar-model";
import type { ArTarget } from "@/lib/ar-target";
import { imageUrl } from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { buildGlb } from "@/lib/glb";
import type { FrameChoice } from "@/lib/room-options";
import { buildUsdz } from "@/lib/usdz";

/**
 * Примерка через камеру телефона (AR-3, TICKETS-ar.md): как модель
 * собирается из фото. Можно ли показать работу в камере и какая у модели
 * версия — lib/ar-target.ts.
 *
 * Модель собирается по запросу и кэшируется на CDN по адресу с версией
 * (решение 2). Версия — отпечаток всего, от чего зависит файл: главного
 * фото, размера холста и ревизии кода сборки. Правка в админке меняет
 * версию, а значит и адрес; старый кэш просто перестаёт быть нужен.
 */

/**
 * Фото внутрь модели. Телефоны берут внутрь JPEG и PNG, а не WebP,
 * в котором фото лежат в хранилище. 2048px по длинной стороне — предел
 * текстуры, который держат все телефоны с AR; больше — только вес.
 */
async function photoJpeg(photoUrl: URL, side = 2048): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(photoUrl);
  if (!response.ok) {
    throw new Error(`Фото для модели не скачалось (${response.status}): ${photoUrl}`);
  }

  const jpeg = await sharp(new Uint8Array(await response.arrayBuffer()))
    .rotate()
    .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return new Uint8Array(jpeg);
}

/** Адрес главного фото работы, от которого собираются модель и фото для стены. */
function photoSource(target: ArTarget): URL {
  const src = imageUrl(target.photo);
  if (src === undefined) {
    throw new Error("Не задан NEXT_PUBLIC_R2_PUBLIC_URL — фото для модели взять неоткуда.");
  }
  return new URL(src, clientEnv.NEXT_PUBLIC_SITE_URL);
}

/**
 * Фото картины для снимка своей стены (lib/ar-links.ts, wallPhotoUrl).
 * 1400px по длинной стороне: на снимке 2000px картина занимает от силы
 * половину ширины, больше — только вес. Каждая картина на стене — одно
 * такое фото.
 */
export async function buildWallPhoto(target: ArTarget): Promise<Uint8Array<ArrayBuffer>> {
  return photoJpeg(photoSource(target), 1400);
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
  options: FrameChoice;
}): Promise<Uint8Array<ArrayBuffer>> {
  const scene = buildPaintingScene({ canvas: target.canvas, ...options });
  const jpeg = await photoJpeg(photoSource(target));

  return file === "model.usdz" ? buildUsdz(scene, jpeg) : buildGlb(scene, jpeg);
}
