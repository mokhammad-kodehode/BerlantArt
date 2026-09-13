import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authEnv, serverEnv } from "@/lib/env";
import { verifyPassword } from "@/lib/password";

/**
 * Вход в админку: проверка пароля и подписанная кука сессии.
 *
 * Здесь нет ни библиотеки аутентификации, ни таблицы пользователей.
 * Аккаунт один, логин и хеш пароля лежат в переменных окружения, а всё,
 * что требуется от «сессии», — доказать, что кука выдана нами и ещё
 * не протухла. Подписью и хешированием занимается node:crypto,
 * своего криптографического кода здесь нет.
 *
 * Почему не NextAuth, как планировалось: его пятая версия, единственная
 * пригодная для App Router, за два года не вышла из беты
 * (5.0.0-beta.32). Обоснование замены — в ARCHITECTURE.md, раздел 4.
 */

/**
 * Имя куки. Префикс `__Host-` браузер отдаёт только по HTTPS и только
 * этому домену, без поддоменов, — подставить такую куку с соседнего сайта
 * нельзя. По http она не ставится вовсе, поэтому в разработке имя другое.
 */
export const sessionCookieName =
  serverEnv.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session";

/**
 * Сколько живёт сессия. Неделя: художница заходит в админку редко,
 * и логин при каждом заходе превратился бы в повод записать пароль
 * на бумажке рядом с ноутбуком.
 */
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;

/**
 * Ключ, которым подписывается кука.
 *
 * Составлен из секрета и хеша пароля намеренно: смена пароля меняет ключ,
 * а значит все выданные раньше куки разом перестают действовать. Иначе
 * укравший сессию оставался бы внутри и после смены пароля.
 */
function sessionKey(): string {
  const env = authEnv();
  return `${env.AUTH_SECRET}:${env.AUTH_ADMIN_PASSWORD_HASH}`;
}

/**
 * Содержимое куки: срок годности и подпись от него.
 *
 * Больше в куке ничего нет — пользователь один, хранить его имя незачем.
 * Срок входит в подпись, поэтому продлить сессию, поправив куку в браузере,
 * не получится.
 *
 * `key` передаётся аргументом, а не берётся из окружения, чтобы функция
 * оставалась чистой и проверялась тестами без заполненного `.env.local`.
 */
export function signSession(expiresAt: number, key: string): string {
  const payload = String(expiresAt);
  const signature = createHmac("sha256", key).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Проверяет куку: наша ли подпись и не истёк ли срок.
 *
 * `now` тоже аргумент — по той же причине, что и `key`: тест на просроченную
 * сессию не должен ждать неделю и подменять системное время.
 */
export function verifySession(token: string | undefined, key: string, now: number): boolean {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const actual = Buffer.from(token.slice(separator + 1), "utf8");
  const expected = Buffer.from(
    createHmac("sha256", key).update(payload).digest("base64url"),
    "utf8",
  );

  // Длины сверяются отдельно: timingSafeEqual на буферах разной длины
  // не возвращает false, а бросает исключение.
  if (actual.length !== expected.length) return false;
  if (!timingSafeEqual(actual, expected)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

/**
 * Сверяет пару «почта — пароль» с тем, что лежит в переменных окружения.
 *
 * Почта сравнивается без учёта регистра: «Berlant@…» и «berlant@…» — один
 * и тот же ящик, а требовать точного написания значит ловить человека
 * на автозаглавной букве телефонной клавиатуры.
 *
 * Пароль проверяется даже при несовпавшей почте — иначе ответ на чужую
 * почту приходил бы заметно быстрее, и перебор по времени ответа отличал
 * бы существующий логин от несуществующего.
 */
export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const env = authEnv();

  const emailMatches = email.trim().toLowerCase() === env.AUTH_ADMIN_EMAIL.toLowerCase();
  const passwordMatches = await verifyPassword(password, env.AUTH_ADMIN_PASSWORD_HASH);

  return emailMatches && passwordMatches;
}

/** Выдаёт куку сессии. Зовётся Server Action'ом формы входа после того,
 * как пара логин-пароль сошлась. */
export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + sessionTtlMs;

  (await cookies()).set(sessionCookieName, signSession(expiresAt, sessionKey()), {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Гасит сессию. Стирается только кука: состояния сессии на сервере нет,
 * стирать больше нечего. */
export async function destroySession(): Promise<void> {
  (await cookies()).delete(sessionCookieName);
}

/** Есть ли у текущего запроса действующая сессия. */
export async function hasSession(): Promise<boolean> {
  return verifySession((await cookies()).get(sessionCookieName)?.value, sessionKey(), Date.now());
}

/**
 * Второй рубеж защиты: зовётся внутри страниц `/admin` и Server Action'ов.
 *
 * Проверка в `proxy.ts` — оптимистичная и живёт отдельно от данных;
 * документация Next прямо предупреждает, что одной её мало. Эта работает
 * рядом с тем, что защищает, и сработает, даже если новый маршрут забыли
 * вписать в matcher.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await hasSession())) redirect("/admin/login");
}

/**
 * Проверка токена, вынутого из запроса вручную.
 *
 * Нужна `proxy.ts`: он работает до входа в приложение, куки читает
 * из `NextRequest`, а не через `cookies()`. Своей копии логики проверки
 * у него от этого не появляется.
 */
export function verifySessionToken(token: string | undefined): boolean {
  return verifySession(token, sessionKey(), Date.now());
}

/**
 * Проверка для Server Action'ов: падает, а не уводит на страницу входа.
 *
 * Отдельно от `requireAdmin()` намеренно. Экшен — это публичный POST
 * к странице: документация Next прямо предупреждает, что дойти до него
 * можно мимо интерфейса, и отрисованная на закрытой странице форма
 * защитой не является. Редирект в ответ на такой POST выглядел бы как
 * успех с пустым результатом; громкая ошибка честнее.
 */
export async function assertAdmin(): Promise<void> {
  if (!(await hasSession())) {
    throw new Error("Нет доступа: действие требует входа в админку.");
  }
}
