import { createHmac } from "node:crypto";

import { headers } from "next/headers";

import { db } from "@/lib/db";
import { authEnv } from "@/lib/env";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Ограничение попыток входа в админку (тикет О-16): пять неудачных за
 * 15 минут — вход с этого адреса закрыт на 15 минут.
 *
 * Попытка засчитывается до проверки пароля, а не после неудачи. Иначе
 * сто одновременных запросов успели бы проверить сто паролей, пока
 * счётчик дошёл бы до пяти.
 *
 * Общего лимита на все адреса нет намеренно: им посторонний мог бы
 * закрыть вход самой художнице.
 */

const minuteMs = 60_000;

/** Сколько раз подряд можно ошибиться; следующая попытка уже закрыта. */
export const maxAttempts = 5;

/** Окно, в котором считаются ошибки, и пауза после них — значения обзора. */
export const windowMs = 15 * minuteMs;
export const lockMs = 15 * minuteMs;

/** Записи старше суток удаляются: ни окна, ни паузы в них уже нет. */
const staleMs = 24 * 60 * minuteMs;

/** Состояние счётчика одного адреса — то, что лежит в таблице LoginThrottle. */
export type ThrottleState = {
  attempts: number;
  windowStart: Date;
  lockedUntil: Date | null;
};

/**
 * Решение по очередной попытке. `next` — что записать в таблицу. Три
 * случая: попытка проходит; попытка закрывает вход (записать паузу);
 * вход уже закрыт (`next: null` — счётчик трогать незачем).
 */
export type ThrottleDecision =
  | { isAllowed: true; next: ThrottleState }
  | { isAllowed: false; next: ThrottleState; retryAfterMs: number }
  | { isAllowed: false; next: null; retryAfterMs: number };

/**
 * Пускать ли очередную попытку и каким станет счётчик.
 *
 * Чистая функция без базы — правила проверяются тестами
 * (lib/login-throttle.test.ts).
 */
export function nextAttempt(current: ThrottleState | null, now: Date): ThrottleDecision {
  if (current?.lockedUntil && current.lockedUntil > now) {
    return {
      isAllowed: false,
      next: null,
      retryAfterMs: current.lockedUntil.getTime() - now.getTime(),
    };
  }

  // Пауза закончилась или окно прошло — считаем заново, старые ошибки
  // не тянутся за адресом.
  const isFresh =
    !current ||
    current.lockedUntil !== null ||
    now.getTime() - current.windowStart.getTime() >= windowMs;
  if (isFresh) {
    return { isAllowed: true, next: { attempts: 1, windowStart: now, lockedUntil: null } };
  }

  const attempts = current.attempts + 1;
  if (attempts > maxAttempts) {
    const lockedUntil = new Date(now.getTime() + lockMs);
    return {
      isAllowed: false,
      next: { attempts, windowStart: current.windowStart, lockedUntil },
      retryAfterMs: lockMs,
    };
  }

  return {
    isAllowed: true,
    next: { attempts, windowStart: current.windowStart, lockedUntil: null },
  };
}

/**
 * Отпечаток адреса вместо самого адреса: адрес — личные данные, а для
 * счётчика достаточно отличать один адрес от другого. С секретом, чтобы
 * по отпечатку нельзя было перебором восстановить адрес.
 */
export function throttleKey(address: string, secret: string): string {
  return createHmac("sha256", secret).update(address).digest("base64url");
}

/**
 * Адрес посетителя. Vercel сам ставит `x-forwarded-for` и присланный
 * посетителем заголовок не пропускает, поэтому подделать адрес нельзя.
 * Без заголовка (разработка) все попытки делят один счётчик — это
 * строже, а не мягче.
 */
async function clientAddress(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
}

/** Ключ счётчика для текущего запроса. Без AUTH_SECRET бросает ошибку настройки. */
export async function loginThrottleKey(): Promise<string> {
  return throttleKey(await clientAddress(), authEnv().AUTH_SECRET);
}

/** Чем закончилась регистрация попытки. */
export type LoginAttempt = { isAllowed: true } | { isAllowed: false; retryAfterMs: number };

/**
 * Засчитывает попытку входа и говорит, можно ли проверять пароль.
 *
 * Запись проходит, только если строку никто не успел поменять (версия
 * строки). Проигравший гонку запрос получает отказ: у художницы гонки
 * не бывает, а пачка одновременных запросов при подборе так не
 * проскочит мимо счётчика.
 */
export async function registerLoginAttempt(key: string, now = new Date()): Promise<LoginAttempt> {
  const [current] = await Promise.all([
    db.loginThrottle.findUnique({ where: { key } }),
    // Свою строку не трогаем: иначе её удаление посреди попытки выглядело
    // бы как чужая запись, и попытка получила бы отказ.
    db.loginThrottle.deleteMany({
      where: { updatedAt: { lt: new Date(now.getTime() - staleMs) }, NOT: { key } },
    }),
  ]);

  const decision = nextAttempt(current, now);
  if (decision.next === null) return { isAllowed: false, retryAfterMs: decision.retryAfterMs };

  const isWritten = current
    ? await updateIfUnchanged(key, current.version, decision.next)
    : await createIfAbsent(key, decision.next);

  if (!isWritten) return { isAllowed: false, retryAfterMs: minuteMs };
  return decision.isAllowed
    ? { isAllowed: true }
    : { isAllowed: false, retryAfterMs: decision.retryAfterMs };
}

async function updateIfUnchanged(
  key: string,
  version: number,
  next: ThrottleState,
): Promise<boolean> {
  const { count } = await db.loginThrottle.updateMany({
    where: { key, version },
    data: { ...next, version: { increment: 1 } },
  });
  return count === 1;
}

async function createIfAbsent(key: string, next: ThrottleState): Promise<boolean> {
  try {
    await db.loginThrottle.create({ data: { key, ...next } });
    return true;
  } catch (error) {
    // P2002 — строку с этим ключом только что создал соседний запрос.
    // Это та же гонка, что и в updateIfUnchanged; прочее пусть падает.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

/** Удачный вход обнуляет счётчик: прошлые опечатки не копятся к следующему разу. */
export async function clearLoginAttempts(key: string): Promise<void> {
  await db.loginThrottle.deleteMany({ where: { key } });
}
