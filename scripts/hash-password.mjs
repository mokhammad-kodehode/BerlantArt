import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { hashPassword } from "../lib/password.ts";

/**
 * Генератор значений для .env.local: хеша пароля администратора и секрета
 * для подписи сессий.
 *
 *   node scripts/hash-password.mjs            хеш пароля
 *   node scripts/hash-password.mjs --secret   секрет AUTH_SECRET
 *
 * Пароль вводится здесь и никуда не уходит: ни в переписку, ни в файл,
 * ни в историю команд (.ai/rules/security.md). В .env.local попадает
 * только хеш, по которому пароль не восстанавливается.
 *
 * Файл с расширением .mjs, а не .ts, но импортирует .ts напрямую: Node 26
 * сам срезает типы. Это дешевле, чем заводить в проекте сборку скриптов
 * ради одного файла.
 */

if (process.argv.includes("--secret")) {
  console.log(`AUTH_SECRET="${randomBytes(32).toString("base64url")}"`);
  process.exit(0);
}

const rl = createInterface({ input: stdin, output: stdout });

/**
 * Ввод без эха: пароль не должен остаться на экране, за которым мог кто-то
 * наблюдать, и не должен попасть в скриншот. Работает подменой вывода
 * на время вопроса — готового способа в readline нет.
 */
async function askHidden(question) {
  stdout.write(question);

  const originalWrite = stdout.write.bind(stdout);
  stdout.write = () => true;

  try {
    return await rl.question("");
  } finally {
    stdout.write = originalWrite;
    stdout.write("\n");
  }
}

const password = await askHidden("Пароль администратора: ");
const repeat = await askHidden("Ещё раз: ");
rl.close();

if (password !== repeat) {
  console.error("\nПароли не совпали. Запусти команду заново.");
  process.exit(1);
}

if (password.length < 12) {
  // Не рекомендация, а отказ: пароль от админки один на весь сайт,
  // и перебирать его будут не руками.
  console.error("\nСлишком короткий пароль: нужно хотя бы 12 символов.");
  process.exit(1);
}

const hash = await hashPassword(password);

console.log("\nВпиши в .env.local:\n");
console.log(`AUTH_ADMIN_PASSWORD_HASH="${hash}"`);
