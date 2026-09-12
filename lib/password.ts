import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Хеширование и проверка пароля администратора.
 *
 * Вынесено отдельно от `lib/auth.ts` намеренно: этот файл ничего не знает
 * ни про Next, ни про переменные окружения, поэтому его напрямую запускает
 * `scripts/hash-password.mjs` — иначе скрипту для генерации хеша пришлось
 * бы тащить за собой `next/headers` и всю конфигурацию.
 *
 * Алгоритм — scrypt из node:crypto, а не bcrypt из пакета. Он встроен
 * в Node, по стойкости к перебору на видеокартах не хуже, и это минус одна
 * зависимость (.ai/rules/code-style.md).
 */

/** Длина ключа. Остальные параметры — умолчания Node (N=16384, r=8, p=1):
 * около 100 мс на одну проверку, это и есть защита от перебора. */
const keyLength = 64;

/** Длина соли. 16 байт — общепринятый минимум. */
const saltLength = 16;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/**
 * Хеш пароля в формате `scrypt:<соль>:<ключ>`, обе части в hex.
 *
 * Разделитель — двоеточие, хотя привычные хеши bcrypt разделяются
 * долларом. Причина поймана живьём: Next разворачивает `$` в значениях
 * `.env` как подстановку переменной, и хеш вида `scrypt$соль$ключ`
 * доезжал до схемы обрезанным до слова `scrypt`. С bcrypt грабли были бы
 * те же самые.
 *
 * Соль случайная и хранится рядом с хешем — так и задумано: она не секрет,
 * её задача в том, чтобы одинаковые пароли давали разные хеши
 * и заранее посчитанные таблицы не работали.
 *
 * Зовётся только скриптом: в приложении пароли не заводятся, аккаунт один.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const key = await derive(password, salt);

  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

/**
 * Сверяет введённый пароль с сохранённым хешем.
 *
 * Сравнение через `timingSafeEqual`, а не `===`: обычное сравнение
 * останавливается на первом различающемся байте, и по времени ответа
 * перебор угадывает хеш кусками.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== keyLength) return false;

  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}
