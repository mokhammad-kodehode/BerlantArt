import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Временная база для тестов слоя данных (тикет О-17).
 *
 * Настоящий PostgreSQL внутри процесса тестов — PGlite, — а не подделка:
 * слой данных опирается на то, чего подделка не умеет, — транзакции,
 * сортировку, `translate()` и `LIKE` в поиске. Боевую базу тесты не
 * трогают вовсе; Docker и отдельный сервер не нужны, поэтому то же
 * работает и в проверках GitHub.
 *
 * Схема — из миграций проекта по порядку, как на проде: тест упадёт,
 * если миграция и код разойдутся. Prisma подключается к PGlite через
 * сокет тем же адаптером `pg`, что и сайт (lib/db.ts).
 *
 * Подключается к тестам подменой `@/lib/db`:
 *
 *     vi.mock("@/lib/db", async () => ({
 *       db: (await import("@/lib/testing/test-db")).testDatabase.db,
 *     }));
 *
 * Только для тестов: код сайта этот модуль не импортирует.
 */

const migrationsDir = path.join(import.meta.dirname, "..", "..", "prisma", "migrations");

function migrations(): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
    .sort();
}

/**
 * Подключение закрыто сервером (P1017). Так `pglite-socket` 0.1.3 отвечает
 * на любую ошибку в запросе — например, на вторую строку с тем же ключом:
 * сама ошибка доходит до кода как есть, но следующий запрос падает
 * с «Server has closed the connection». Настоящий PostgreSQL после ошибки
 * в запросе подключение не закрывает, поэтому тесты не должны видеть эту
 * особенность временного сервера.
 */
function isConnectionClosed(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P1017";
  // На Linux подключение закрывается раньше — прямо во время соседнего
  // запроса, и `pg` бросает свою ошибку без кода Prisma (поймано
  // проверкой GitHub 23.10.2026; на Windows приходит P1017).
  return error instanceof Error && error.message === "Connection terminated unexpectedly";
}

/**
 * Запрос, наткнувшийся на закрытое подключение, повторяется один раз —
 * уже по новому: пул `pg` открывает его сам. Повтор безопасен: закрывая
 * подключение, сервер выбрасывает и все не выполненные на нём запросы.
 * Остальные ошибки доходят до кода и до теста как есть.
 */
function withReconnect(client: PrismaClient) {
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isConnectionClosed(error)) throw error;
          return query(args);
        }
      },
    },
  });
}

async function start() {
  const pg = await PGlite.create();
  // По одной и по порядку: следующая миграция опирается на предыдущую.
  for (const file of migrations()) await pg.exec(readFileSync(file, "utf8"));

  const server = new PGLiteSocketServer({ db: pg, host: "127.0.0.1", port: 0 });
  await server.start();

  // Одно соединение: PGlite обслуживает запросы по одному, а пул из
  // нескольких соединений ждал бы друг друга.
  const db = withReconnect(
    new PrismaClient({
      adapter: new PrismaPg({
        connectionString: `postgresql://postgres@${server.getServerConn()}/postgres`,
        max: 1,
      }),
    }),
  );

  return {
    db,
    stop: async () => {
      await db.$disconnect();
      await server.stop();
      await pg.close();
    },
  };
}

/** База поднимается один раз на файл тестов — около двух секунд. */
export const testDatabase = await start();

/** Пустые таблицы перед каждым тестом: тесты не зависят от порядка запуска. */
export async function resetTestDatabase(): Promise<void> {
  const tables = await testDatabase.db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
  await testDatabase.db.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}
