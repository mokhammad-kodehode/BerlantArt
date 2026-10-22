import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Подставная таблица LoginThrottle в памяти. Повторяет то, на что
 * опирается lib/login-throttle.ts: запись по версии строки, ошибку P2002
 * при повторном создании, удаление по условию.
 */
type Row = {
  key: string;
  attempts: number;
  windowStart: Date;
  lockedUntil: Date | null;
  version: number;
  updatedAt: Date;
};

const rows = new Map<string, Row>();

type Where = {
  key?: string;
  version?: number;
  updatedAt?: { lt: Date };
  NOT?: { key: string };
};

function matches(row: Row, where: Where): boolean {
  if (where.key !== undefined && row.key !== where.key) return false;
  if (where.version !== undefined && row.version !== where.version) return false;
  if (where.updatedAt && !(row.updatedAt < where.updatedAt.lt)) return false;
  if (where.NOT && row.key === where.NOT.key) return false;
  return true;
}

const loginThrottle = {
  findUnique: async ({ where }: { where: { key: string } }) => {
    const row = rows.get(where.key);
    return row ? { ...row } : null;
  },
  deleteMany: async ({ where }: { where: Where }) => {
    let count = 0;
    for (const row of [...rows.values()]) {
      if (matches(row, where)) {
        rows.delete(row.key);
        count += 1;
      }
    }
    return { count };
  },
  updateMany: async ({
    where,
    data,
  }: {
    where: Where;
    data: Omit<Row, "key" | "version" | "updatedAt"> & { version: { increment: number } };
  }) => {
    const row = [...rows.values()].find((candidate) => matches(candidate, where));
    if (!row) return { count: 0 };
    rows.set(row.key, {
      ...row,
      ...data,
      version: row.version + data.version.increment,
      updatedAt: new Date(),
    });
    return { count: 1 };
  },
  create: async ({ data }: { data: Omit<Row, "version" | "updatedAt"> }) => {
    if (rows.has(data.key)) {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      });
    }
    rows.set(data.key, { ...data, version: 0, updatedAt: new Date() });
    return rows.get(data.key);
  },
};

vi.mock("@/lib/db", () => ({ db: { loginThrottle } }));

const {
  clearLoginAttempts,
  lockMs,
  maxAttempts,
  nextAttempt,
  registerLoginAttempt,
  throttleKey,
  windowMs,
} = await import("@/lib/login-throttle");

const start = new Date("2026-10-22T12:00:00Z");
const after = (ms: number) => new Date(start.getTime() + ms);
const minute = 60_000;

describe("nextAttempt", () => {
  it("первая попытка проходит и открывает окно", () => {
    expect(nextAttempt(null, start)).toEqual({
      isAllowed: true,
      next: { attempts: 1, windowStart: start, lockedUntil: null },
    });
  });

  it("пятая попытка в окне ещё проходит", () => {
    const decision = nextAttempt(
      { attempts: 4, windowStart: start, lockedUntil: null },
      after(minute),
    );
    expect(decision).toEqual({
      isAllowed: true,
      next: { attempts: 5, windowStart: start, lockedUntil: null },
    });
  });

  it("шестая попытка в окне закрывает вход на 15 минут", () => {
    const now = after(2 * minute);
    const decision = nextAttempt(
      { attempts: maxAttempts, windowStart: start, lockedUntil: null },
      now,
    );
    expect(decision).toEqual({
      isAllowed: false,
      next: { attempts: 6, windowStart: start, lockedUntil: new Date(now.getTime() + lockMs) },
      retryAfterMs: lockMs,
    });
  });

  it("во время паузы — отказ без записи, с оставшимся временем", () => {
    const lockedUntil = after(15 * minute);
    const decision = nextAttempt(
      { attempts: 6, windowStart: start, lockedUntil },
      after(10 * minute),
    );
    expect(decision).toEqual({ isAllowed: false, next: null, retryAfterMs: 5 * minute });
  });

  it("после паузы счёт начинается заново", () => {
    const decision = nextAttempt(
      { attempts: 6, windowStart: start, lockedUntil: after(15 * minute) },
      after(15 * minute),
    );
    expect(decision).toEqual({
      isAllowed: true,
      next: { attempts: 1, windowStart: after(15 * minute), lockedUntil: null },
    });
  });

  it("ошибки старше окна не считаются", () => {
    const decision = nextAttempt(
      { attempts: maxAttempts, windowStart: start, lockedUntil: null },
      after(windowMs),
    );
    expect(decision).toEqual({
      isAllowed: true,
      next: { attempts: 1, windowStart: after(windowMs), lockedUntil: null },
    });
  });
});

describe("throttleKey", () => {
  it("один адрес — один ключ, и самого адреса в ключе нет", () => {
    const key = throttleKey("203.0.113.7", "secret");
    expect(throttleKey("203.0.113.7", "secret")).toBe(key);
    expect(key).not.toContain("203.0.113.7");
  });

  it("другой адрес или другой секрет — другой ключ", () => {
    const key = throttleKey("203.0.113.7", "secret");
    expect(throttleKey("203.0.113.8", "secret")).not.toBe(key);
    expect(throttleKey("203.0.113.7", "other")).not.toBe(key);
  });
});

describe("registerLoginAttempt", () => {
  beforeEach(() => rows.clear());

  it("пять попыток подряд проходят, шестая — нет", async () => {
    const results = [];
    for (let i = 0; i < maxAttempts + 1; i += 1) {
      // Попытки по очереди намеренно: здесь проверяется счёт, а не гонка.
      results.push(await registerLoginAttempt("a", after(i * minute)));
    }
    expect(results.slice(0, maxAttempts).every((result) => result.isAllowed)).toBe(true);
    expect(results[maxAttempts]).toEqual({ isAllowed: false, retryAfterMs: lockMs });
  });

  it("удачный вход обнуляет счётчик", async () => {
    for (let i = 0; i < maxAttempts; i += 1) {
      await registerLoginAttempt("a", after(i * minute));
    }
    await clearLoginAttempts("a");
    expect(await registerLoginAttempt("a", after(6 * minute))).toEqual({ isAllowed: true });
  });

  it("у разных адресов счётчики отдельные", async () => {
    for (let i = 0; i < maxAttempts + 1; i += 1) {
      await registerLoginAttempt("a", after(i * minute));
    }
    expect(await registerLoginAttempt("b", after(7 * minute))).toEqual({ isAllowed: true });
  });

  it("из двух одновременных попыток проходит одна — и при первой записи, и при обновлении", async () => {
    const first = await Promise.all([
      registerLoginAttempt("a", start),
      registerLoginAttempt("a", start),
    ]);
    expect(first.filter((result) => result.isAllowed)).toHaveLength(1);

    const second = await Promise.all([
      registerLoginAttempt("a", after(minute)),
      registerLoginAttempt("a", after(minute)),
    ]);
    expect(second.filter((result) => result.isAllowed)).toHaveLength(1);
  });

  it("уборка старых записей не трогает строку текущего адреса", async () => {
    const dayAgo = new Date(Date.now() - 25 * 60 * minute);
    const stale = {
      attempts: 3,
      windowStart: dayAgo,
      lockedUntil: null,
      version: 0,
      updatedAt: dayAgo,
    };
    rows.set("a", { key: "a", ...stale });
    rows.set("old", { key: "old", ...stale });

    expect(await registerLoginAttempt("a")).toEqual({ isAllowed: true });
    expect(rows.has("old")).toBe(false);
  });
});
