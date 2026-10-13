import path from "node:path";
import { pathToFileURL } from "node:url";

import { AwsClient } from "aws4fetch";
import pg from "pg";
import sharp from "sharp";

/**
 * Разовая нарезка уменьшенных копий для фото, загруженных до тикета И-1
 * (TICKETS-images.md, ARCHITECTURE.md §8). Новые фото получают копии сами,
 * при загрузке (lib/make-variants.ts).
 *
 * Запускается **перед каждой сборкой основного сайта на Vercel** (`build`
 * в package.json): там есть ключи бакета и базы, а у нас нет отдельного
 * сервера для таких задач. Безопасна при повторе — берёт только фото, у
 * которых копий ещё нет, — и **никогда не роняет сборку**: что не вышло,
 * останется исходником и дорежется при следующей выкладке.
 *
 * Что делает с каждым фото: кладёт исходник по новому ключу в папку
 * `artworks/v2/`, режет рядом 4 копии и меняет ключ в базе. Старый файл
 * не удаляется: пока идёт сборка, на него ещё ссылается работающая версия
 * сайта. Лишнее место — копейки (≈0.1 ГБ).
 *
 * Вне Vercel — только по явной команде `npm run make-image-variants`:
 * в `.env.local` у заказчика ключи боевого бакета, и обычный
 * `npm run build` дома не должен их трогать.
 *
 * Написан на чистом JS, а не TS: Node на сборочной машине Vercel может не
 * уметь исполнять TS сам, а падение здесь молча оставило бы сайт без копий.
 * Правила ключей повторяют lib/image-variants.ts — их сверяет тест.
 */

export const variantPrefix = "artworks/v2/";
export const variantWidths = [400, 800, 1200, 1600];

/** Старый ключ без папки v2 — тот же шаблон, что isOwnObjectKey, но только старые. */
const oldKeyPattern = /^artworks\/[0-9a-f-]{36}(-[a-z0-9-]{1,40})?\.(jpg|png|webp)$/;

/** Новый ключ исходника: та же папка `artworks/`, внутри — `v2/`. */
export function upgradedKey(oldKey) {
  return `${variantPrefix}${oldKey.slice("artworks/".length)}`;
}

/** Ключ копии — как variantKey в lib/image-variants.ts. */
export function variantKey(key, width) {
  return `${key.replace(/\.[a-z0-9]+$/, "")}.w${width}.webp`;
}

/** Сколько фото обрабатывать разом: больше — упрёмся в память сборщика. */
const concurrency = 4;

/** Сколько времени тратить на прогон: остальное доделает следующая выкладка. */
const timeBudgetMs = 10 * 60 * 1000;

function shouldRun() {
  if (process.argv.includes("--run")) return true;
  if (process.env.VERCEL) return process.env.VERCEL_ENV === "production";
  return false;
}

async function main() {
  if (!shouldRun()) {
    console.log("[копии фото] пропуск: не основная сборка Vercel и не --run.");
    return;
  }

  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"));
  } catch {
    // Файла нет — значит переменные уже в окружении (Vercel).
  }

  // DIRECT_URL — прямой сеансовый вход: прогон держит одно соединение
  // минуты, пулу транзакций (DATABASE_URL) это ни к чему.
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const env = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET_NAME,
  };
  if (!connectionString || Object.values(env).some((value) => !value)) {
    console.log("[копии фото] пропуск: нет DIRECT_URL/DATABASE_URL или переменных R2_*.");
    return;
  }

  const s3 = new AwsClient({
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const objectUrl = (key) =>
    `https://${env.accountId}.r2.cloudflarestorage.com/${env.bucket}/${key}`;
  const put = async (key, body, contentType) => {
    const response = await s3.fetch(objectUrl(key), {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    if (!response.ok) throw new Error(`запись ${key}: ${response.status}`);
  };

  // Без ответа базы за 15 с — не ждём: сборка важнее нарезки.
  const db = new pg.Client({ connectionString, connectionTimeoutMillis: 15_000 });
  await db.connect();

  try {
    const { rows } = await db.query(
      `SELECT "id", "url" FROM "Image" WHERE "url" LIKE 'artworks/%' AND "url" NOT LIKE 'artworks/v2/%'`,
    );
    const todo = rows.filter((row) => oldKeyPattern.test(row.url));
    console.log(`[копии фото] без копий: ${todo.length}`);

    const started = Date.now();
    let done = 0;
    let failed = 0;

    const processOne = async ({ id, url: oldKey }) => {
      const response = await s3.fetch(objectUrl(oldKey));
      if (!response.ok) throw new Error(`чтение ${oldKey}: ${response.status}`);
      const original = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/webp";

      const newKey = upgradedKey(oldKey);
      // Копии — раньше исходника и записи в базе: ключ в папке v2 обещает
      // сайту полный набор, и половинчатого состояния быть не должно.
      for (const width of variantWidths) {
        const copy = await sharp(original)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        await put(variantKey(newKey, width), new Uint8Array(copy), "image/webp");
      }
      await put(newKey, original, contentType);

      // `AND "url" = $3`: если художница за это время заменила фото,
      // её правку не затираем.
      await db.query(`UPDATE "Image" SET "url" = $1 WHERE "id" = $2 AND "url" = $3`, [
        newKey,
        id,
        oldKey,
      ]);
    };

    const queue = [...todo];
    const worker = async () => {
      while (queue.length > 0 && Date.now() - started < timeBudgetMs) {
        const row = queue.shift();
        try {
          await processOne(row);
          done++;
        } catch (error) {
          failed++;
          console.error(`[копии фото] не вышло для ${row.url}:`, error.message ?? error);
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));

    console.log(
      `[копии фото] готово: ${done}, с ошибкой: ${failed}, отложено до следующей выкладки: ${queue.length}.`,
    );
  } finally {
    await db.end();
  }
}

// Импорт из теста не должен запускать нарезку — только прямой запуск.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    // Сборку не роняем: сайт работает и без копий, фото покажутся исходниками.
    console.error("[копии фото] прогон не удался, сборка продолжается:", error);
  });
}
