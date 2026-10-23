import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * Временный PostgreSQL со схемой проекта — PGlite прямо в процессе,
 * доступный по обычной строке подключения (`postgresql://…`).
 *
 * Двое пользуются: тесты слоя данных (lib/testing/test-db.ts, О-17)
 * и проверка сайта целиком (scripts/site-check, О-19), которой база
 * нужна для сборки и запуска сайта. Файл .mjs, а не .ts: проверку сайта
 * запускает сам Node, без сборщика.
 *
 * Схема — из миграций проекта по порядку, как на проде: разойдись код
 * и миграции — упадут и тесты, и проверка. Боевую базу это не трогает.
 */

const migrationsDir = path.join(import.meta.dirname, "..", "..", "prisma", "migrations");

/** Файлы миграций по порядку: следующая опирается на предыдущую. */
function migrations() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
    .sort();
}

/**
 * Поднимает базу и сервер. Порт 0 — любой свободный; строка подключения
 * в ответе уже с настоящим портом.
 *
 * @param {{ port?: number; maxConnections?: number }} [options]
 *   maxConnections — запас для сборки сайта: Next собирает страницы
 *   в десяти с лишним процессах, и у каждого свой пул подключений.
 * @returns {Promise<{ connectionString: string; pg: PGlite; stop: () => Promise<void> }>}
 *   pg — сама база, для запросов из этого же процесса мимо сокета.
 */
export async function startPgliteServer({ port = 0, maxConnections = 100 } = {}) {
  const pg = await PGlite.create();
  for (const file of migrations()) await pg.exec(readFileSync(file, "utf8"));

  const server = new PGLiteSocketServer({ db: pg, host: "127.0.0.1", port, maxConnections });
  await server.start();

  return {
    connectionString: `postgresql://postgres@${server.getServerConn()}/postgres`,
    pg,
    stop: async () => {
      await server.stop();
      await pg.close();
    },
  };
}
