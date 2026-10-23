import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { clearLoginAttempts, maxAttempts, registerLoginAttempt } from "@/lib/login-throttle";
import { resetTestDatabase, testDatabase } from "@/lib/testing/test-db";

/**
 * Счётчик попыток входа на настоящей базе (тикеты О-16, О-17). Тест
 * в lib/login-throttle.test.ts проверяет правила на подделке таблицы;
 * здесь — то, что подделка изображает: отказ базы на вторую строку
 * с тем же ключом (P2002) и запись по версии строки.
 */

vi.mock("@/lib/db", async () => ({
  db: (await import("@/lib/testing/test-db")).testDatabase.db,
}));

beforeEach(resetTestDatabase);
afterAll(() => testDatabase.stop());

const allowed = (results: { isAllowed: boolean }[]) =>
  results.filter((result) => result.isAllowed).length;

describe("счётчик попыток входа на настоящей базе", () => {
  it("две одновременные первые попытки: база пускает одну строку, проходит одна попытка", async () => {
    const results = await Promise.all([registerLoginAttempt("a"), registerLoginAttempt("a")]);
    expect(allowed(results)).toBe(1);
    expect(await testDatabase.db.loginThrottle.count()).toBe(1);
  });

  it("одновременные попытки к уже заведённому счётчику: проходит одна", async () => {
    await registerLoginAttempt("a");
    const results = await Promise.all([registerLoginAttempt("a"), registerLoginAttempt("a")]);
    expect(allowed(results)).toBe(1);
  });

  it("пять попыток проходят, шестая — нет; удачный вход обнуляет счётчик", async () => {
    const results = [];
    for (let i = 0; i < maxAttempts + 1; i += 1) {
      // По очереди намеренно: проверяется счёт, а не гонка.
      results.push(await registerLoginAttempt("a"));
    }
    expect(allowed(results)).toBe(maxAttempts);
    expect(results.at(-1)?.isAllowed).toBe(false);

    await clearLoginAttempts("a");
    expect((await registerLoginAttempt("a")).isAllowed).toBe(true);
  });
});
