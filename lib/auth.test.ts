import { describe, expect, it } from "vitest";

import { signSession, verifySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * Тут проверяется то, что нельзя увидеть глазами: подделанную куку браузер
 * покажет точно так же, как настоящую, и отличить их можно только проверкой.
 */

const key = "секрет-для-тестов:scrypt:0123:abcd";
const now = 1_700_000_000_000;

describe("подпись сессии", () => {
  it("принимает свою куку со сроком в будущем", () => {
    const token = signSession(now + 1000, key);

    expect(verifySession(token, key, now)).toBe(true);
  });

  it("отвергает просроченную куку", () => {
    const token = signSession(now - 1, key);

    expect(verifySession(token, key, now)).toBe(false);
  });

  it("отвергает подделанный срок годности", () => {
    // Так выглядит попытка продлить сессию правкой куки в браузере:
    // срок меняют, подпись оставляют старую.
    const token = signSession(now - 1, key);
    const forged = `${now + 1_000_000}.${token.split(".")[1]}`;

    expect(verifySession(forged, key, now)).toBe(false);
  });

  it("отвергает куку, подписанную другим ключом", () => {
    // Ключ собран из AUTH_SECRET и хеша пароля, поэтому смена пароля
    // обязана разлогинивать все выданные раньше сессии.
    const token = signSession(now + 1000, "старый-секрет:старый-хеш");

    expect(verifySession(token, key, now)).toBe(false);
  });

  it("не падает на мусоре вместо куки", () => {
    // Подпись другой длины отправила бы timingSafeEqual в исключение,
    // а упавший proxy.ts — это пятисотка на каждой странице админки.
    expect(verifySession(undefined, key, now)).toBe(false);
    expect(verifySession("", key, now)).toBe(false);
    expect(verifySession("без-точки", key, now)).toBe(false);
    expect(verifySession(".подпись", key, now)).toBe(false);
    expect(verifySession(`${now + 1000}.коротко`, key, now)).toBe(false);
  });
});

describe("пароль", () => {
  it("сходится со своим хешем и не сходится с чужим паролем", async () => {
    const hash = await hashPassword("правильный-пароль");

    expect(await verifyPassword("правильный-пароль", hash)).toBe(true);
    expect(await verifyPassword("Правильный-пароль", hash)).toBe(false);
  });

  it("не ставит доллар в хеш", async () => {
    // Не косметика: Next разворачивает $ в значениях .env как подстановку
    // переменной, и хеш в привычном для bcrypt формате scrypt$соль$ключ
    // доезжал до схемы обрезанным до слова scrypt. Поймано живьём.
    expect(await hashPassword("пароль")).not.toContain("$");
  });

  it("даёт разные хеши для одного пароля", async () => {
    // Соль случайная: иначе одинаковые пароли давали бы одинаковые хеши,
    // и заранее посчитанные таблицы работали бы.
    expect(await hashPassword("один и тот же")).not.toBe(await hashPassword("один и тот же"));
  });

  it("отвергает испорченный хеш, а не падает", async () => {
    // Формат проверяется схемой в lib/env.ts, но функция не должна
    // рассчитывать на то, что её всегда зовут с проверенным значением.
    expect(await verifyPassword("пароль", "")).toBe(false);
    expect(await verifyPassword("пароль", "bcrypt:соль:ключ")).toBe(false);
    expect(await verifyPassword("пароль", "scrypt:0123:коротко")).toBe(false);
  });
});
