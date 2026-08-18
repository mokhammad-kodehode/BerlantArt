import { z } from "zod";

/**
 * Валидация переменных окружения на старте приложения.
 *
 * Смысл: упасть при сборке с понятной ошибкой, а не в рантайме на проде
 * с `undefined` в строке подключения.
 *
 * Схема растёт по этапам плана (ROADMAP.md). Добавляются:
 *   этап 3 — DATABASE_URL, DIRECT_URL
 *   этап 5 — R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *            R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL
 *   этап 6 — AUTH_SECRET, AUTH_ADMIN_EMAIL, AUTH_ADMIN_PASSWORD_HASH
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

/**
 * NEXT_PUBLIC_* переменные Next подставляет в бандл только там, где они
 * написаны буквально. Поэтому здесь явный объект, а не спред process.env.
 */
const clientValues = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

function parse<T extends z.ZodType>(schema: T, values: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(values);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Некорректные переменные окружения (${label}):\n${details}\n\n` +
        `Сверься с .env.example и заполни .env.local.`,
    );
  }

  return result.data;
}

export const serverEnv = parse(serverSchema, process.env, "сервер");
export const clientEnv = parse(clientSchema, clientValues, "клиент");
