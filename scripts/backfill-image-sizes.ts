import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

// Расширения .ts обязательны: скрипт исполняет сам Node, он путь
// без расширения не достраивает (как в prisma/seed.ts).
import { PrismaClient } from "../lib/generated/prisma/client.ts";
import { readImageSize } from "../lib/image-size.ts";

/**
 * Разово проставляет размер в пикселях фотографиям, загруженным до AR-1
 * (TICKETS-ar.md). Новые загрузки пишут размер сами.
 *
 * Запуск: `npm run backfill-image-sizes`. Берёт только записи
 * без размера, поэтому повторный запуск безопасен и ничего не перезапишет.
 *
 * Файл, который не удалось прочитать, пропускается с сообщением, а не
 * роняет весь прогон: остальные фото заполнятся, а про пропущенные будет
 * видно, какие именно. У такой работы просто не будет кнопки «Через камеру».
 */

// Своё подключение вместо lib/db.ts и свой адрес бакета вместо lib/r2.ts:
// те написаны под алиасы Next и вне приложения не разрешаются.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // Файла нет — значит переменные уже в окружении (CI, Vercel).
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Нет DATABASE_URL. Заполни .env.local по образцу .env.example.");
}

const bucketUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/+$/, "");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Содержимое файла: путь с ведущим слэшем — из public/, иначе — ключ в R2 (как в imageUrl). */
async function loadBytes(stored: string): Promise<Uint8Array> {
  if (stored.startsWith("/")) {
    return readFile(path.join(process.cwd(), "public", stored));
  }

  if (!bucketUrl) {
    throw new Error("не задан NEXT_PUBLIC_R2_PUBLIC_URL, фото из хранилища не скачать");
  }

  const response = await fetch(`${bucketUrl}/${stored}`);
  if (!response.ok) throw new Error(`хранилище ответило ${response.status}`);

  return new Uint8Array(await response.arrayBuffer());
}

async function main(): Promise<void> {
  const images = await db.image.findMany({
    where: { OR: [{ width: null }, { height: null }] },
    select: { id: true, url: true },
  });

  if (images.length === 0) {
    console.log("У всех фото размер уже есть — делать нечего.");
    return;
  }

  let filled = 0;

  // По очереди, а не через Promise.all: в строке подключения стоит
  // connection_limit=1, параллельные записи упёрлись бы в него.
  for (const image of images) {
    try {
      const size = await readImageSize(await loadBytes(image.url));
      await db.image.update({ where: { id: image.id }, data: size });
      filled += 1;
      console.log(`${image.url}: ${size.width} × ${size.height}`);
    } catch (error) {
      console.error(`${image.url}: пропущено — ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`Готово: ${filled} из ${images.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
