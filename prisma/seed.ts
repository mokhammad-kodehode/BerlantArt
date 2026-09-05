import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

// Расширение .ts в импорте обязательно: скрипт исполняет сам Node, а он,
// в отличие от сборщика Next, путь без расширения не достраивает.
import { PrismaClient } from "../lib/generated/prisma/client.ts";

/**
 * Наполнение базы стартовыми работами.
 *
 * ВАЖНО про содержимое: здесь только то, что известно достоверно.
 * Размеры холстов, годы, цены и описания оставлены пустыми — по ним нет
 * подтверждения художницы, а карточка работы это карточка товара:
 * выдуманный размер холста обманет покупателя (см. .ai/rules/content.md).
 * Названия и техника проставлены по виду работ и тоже ждут подтверждения.
 *
 * Поэтому работ пять, а не двенадцать, как значилось в плане: пять — это
 * все фотографии, что у нас есть. Добивать список выдуманными картинами
 * в боевой базе нельзя.
 *
 * Запускается командой `npx prisma db seed` (команда задана
 * в prisma.config.ts). Скрипт ничего не делает, если в базе уже есть
 * работы: иначе повторный запуск наплодил бы дубли или затёр правки,
 * сделанные через админку.
 */

// Своё подключение вместо lib/db.ts: тот файл написан под алиасы Next
// и вне приложения не разрешается.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // Файла нет — значит переменные уже в окружении (CI, Vercel).
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Нет DATABASE_URL. Заполни .env.local по образцу .env.example.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Фотографии лежат в public/. С этапа 5 их место займут ссылки на R2. */
const artworks = [
  { title: "Башни в тумане", file: "bashni-v-tumane.jpg", status: "AVAILABLE" },
  { title: "Башни на закате", file: "bashni-na-zakate.jpg", status: "AVAILABLE" },
  {
    title: "Дом с бирюзовыми ставнями",
    file: "dom-s-biryuzovymi-stavnyami.jpg",
    status: "AVAILABLE",
  },
  { title: "Мост на закате", file: "most-na-zakate.jpg", status: "SOLD" },
  { title: "Ночной свет", file: "nochnoy-svet.jpg", status: "AVAILABLE" },
] as const;

async function main() {
  const existing = await db.artwork.count();

  if (existing > 0) {
    console.log(`В базе уже ${existing} работ — ничего не меняю.`);
    return;
  }

  // По очереди, а не через Promise.all: в строке подключения стоит
  // connection_limit=1, параллельные вставки упёрлись бы в него.
  for (const artwork of artworks) {
    await db.artwork.create({
      data: {
        title: artwork.title,
        technique: "Холст, масло",
        status: artwork.status,
        // Все пять пока показываем на главной: выбор сильнейших работ —
        // за художницей, она поменяет флаги через админку на этапе 6.
        featured: true,
        images: {
          create: {
            url: `/artworks/${artwork.file}`,
            alt: artwork.title,
            isPrimary: true,
          },
        },
      },
    });
  }

  console.log(`Добавлено работ: ${artworks.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
