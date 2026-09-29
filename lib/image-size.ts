import sharp from "sharp";

import type { Size } from "./prepare-image.ts";

/**
 * Размер картинки в пикселях — так, как её видит человек (AR-1).
 *
 * Читается из самого файла, а не берётся у браузера: при загрузке мы
 * не верим браузеру ни в чём, что касается файла (lib/actions/images.ts).
 *
 * Импорты здесь относительные и с расширением, без алиаса `@/`: функцию
 * зовёт и приложение, и scripts/backfill-image-sizes.ts, а тот исполняет
 * голый Node, который алиасов не понимает.
 */

/**
 * EXIF-повороты 5–8 кладут снимок набок: в файле пиксели записаны
 * «лёжа», а показываются «стоя». Для них ширина и высота меняются местами.
 * Наши загрузки пережимаются в браузере и EXIF не несут, но старые JPEG
 * в public/ — снимки с телефона, у них поворот бывает.
 */
const sidewaysOrientations = new Set([5, 6, 7, 8]);

/**
 * Бросает исключение, если размер не читается: такой файл не картинка,
 * и заводить на него запись нельзя.
 */
export async function readImageSize(bytes: Uint8Array): Promise<Size> {
  const { width, height, orientation } = await sharp(bytes).metadata();

  if (!(width > 0 && height > 0)) {
    throw new Error("Не удалось прочитать размер изображения: файл повреждён или это не картинка.");
  }

  return orientation !== undefined && sidewaysOrientations.has(orientation)
    ? { width: height, height: width }
    : { width, height };
}
