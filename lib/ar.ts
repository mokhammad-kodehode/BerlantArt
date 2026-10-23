import sharp from "sharp";

import type { ArFile, ArOptions } from "@/lib/ar-links";
import { buildPaintingScene } from "@/lib/ar-model";
import type { ArTarget } from "@/lib/ar-target";
import { imageUrl } from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { buildGlb } from "@/lib/glb";
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
  options: ArOptions;
}): Promise<Uint8Array<ArrayBuffer>> {
  const src = imageUrl(target.photo);
  if (src === undefined) {
    throw new Error("Не задан NEXT_PUBLIC_R2_PUBLIC_URL — фото для модели взять неоткуда.");
  }

  const scene = buildPaintingScene({ canvas: target.canvas, ...options });
  const jpeg = await photoJpeg(new URL(src, clientEnv.NEXT_PUBLIC_SITE_URL));

  return file === "model.usdz" ? buildUsdz(scene, jpeg) : buildGlb(scene, jpeg);
}
