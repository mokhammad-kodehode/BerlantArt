import sharp from "sharp";

import { variantKey, variantWidths } from "@/lib/image-variants";
import { deleteObject, putObject } from "@/lib/r2";

/** Качество копий. Как у конвертера при загрузке: на живописи потерь не видно. */
const quality = 82;

/**
 * Режет уменьшенные копии фото и кладёт их в бакет рядом с исходником
 * (тикет И-1). Зовётся из attachImage — байты исходника там уже скачаны
 * ради размера, второй раз за ними не ходим.
 *
 * Фото уже исходника не растягивается (`withoutEnlargement`): копия «1600»
 * у снимка шириной 900 будет шириной 900. Файл всё равно кладётся — сайт
 * не знает ширину исходника и просит копию по имени.
 *
 * Ошибка любой копии — ошибка всей нарезки, и уже положенные копии
 * убираются: ключ в папке v2 обещает сайту полный набор.
 */
export async function makeVariants(key: string, bytes: Uint8Array): Promise<void> {
  try {
    // Параллельно: четыре копии одного фото — это четверть секунды
    // процессора на каждую, ждать их по очереди незачем.
    await Promise.all(
      variantWidths.map(async (width) => {
        const copy = await sharp(bytes)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        await putObject(variantKey(key, width), new Uint8Array(copy), "image/webp");
      }),
    );
  } catch (error) {
    await Promise.allSettled(variantWidths.map((width) => deleteObject(variantKey(key, width))));
    throw error;
  }
}
