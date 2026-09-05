import path from "node:path";

import { defineConfig } from "prisma/config";

/**
 * Конфигурация Prisma 7.
 *
 * В седьмой версии CLI больше не принимает флаг --schema и не читает .env
 * сам — путь к схеме и строка подключения задаются здесь.
 *
 * Переменные грузим из .env.local встроенным process.loadEnvFile: он есть
 * в Node начиная с 20-й версии, отдельная зависимость (dotenv) не нужна.
 * Файла может не быть на чужой машине или в CI — поэтому в try/catch,
 * иначе любая команда Prisma падала бы до того, как объяснит причину.
 */
try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local нет — значит переменные придут из окружения (Vercel, CI).
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  /**
   * Здесь именно DIRECT_URL, а не DATABASE_URL: этот адрес используют
   * миграции и интроспекция, а им нужно прямое соединение на порту 5432.
   * Через pooler (6543) сессионные операции миграций не проходят.
   * Приложение в рантайме ходит по DATABASE_URL — он передаётся драйверному
   * адаптеру в lib/db.ts.
   */
  datasource: {
    url: process.env.DIRECT_URL,
  },

  migrations: {
    // Node 26 исполняет TypeScript сам, отдельный запускатор (tsx, ts-node)
    // не нужен — лишняя зависимость ради одной команды не окупается.
    seed: "node prisma/seed.ts",
  },
});
