import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { serverEnv } from "@/lib/env";

/**
 * Единственный экземпляр клиента Prisma на всё приложение.
 *
 * Зачем синглтон: в режиме разработки Next перезагружает модули при каждой
 * правке файла. Если создавать клиента прямо в модуле, на каждую
 * перезагрузку заводится новое подключение к базе — за час работы их
 * набираются десятки, и Supabase упирается в лимит соединений. Ссылка
 * в globalThis перезагрузку переживает, поэтому клиент создаётся один раз.
 *
 * В проде globalThis не используется: там модуль и так вычисляется однажды.
 *
 * Prisma 7 не умеет подключаться сам — обязателен драйверный адаптер.
 * Строку берём из проверенной схемы (lib/env.ts), а не из process.env
 * напрямую: так пустое значение обнаружится при сборке, а не в рантайме.
 */
function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: serverEnv.DATABASE_URL }),
    log: serverEnv.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
