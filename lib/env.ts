import { z } from "zod";

/**
 * Валидация переменных окружения на старте приложения.
 *
 * Смысл: упасть при сборке с понятной ошибкой, а не в рантайме на проде
 * с `undefined` в строке подключения.
 *
 * Схема растёт по этапам плана (ROADMAP.md). Добавляются:
 *   этап 5 — R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *            R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL
 *   этап 6 — AUTH_SECRET, AUTH_ADMIN_EMAIL, AUTH_ADMIN_PASSWORD_HASH
 *
 * NEXT_PUBLIC_WHATSAPP_PHONE заведена в Э4-5 необязательной: карточка работы
 * рисует кнопку WhatsApp только когда номер заполнен.
 */

const postgresUrl = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
    message: "должна начинаться с postgresql:// — сверься с панелью Supabase, Connect → Prisma",
  });

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Рабочее подключение приложения: pooler, порт 6543. */
  DATABASE_URL: postgresUrl,

  /**
   * Прямое подключение для миграций, порт 5432. Приложению не нужно —
   * его читает только Prisma CLI через prisma.config.ts, поэтому здесь
   * оно необязательное: иначе сайт падал бы из-за переменной, которой
   * не пользуется.
   */
  DIRECT_URL: postgresUrl.optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  /**
   * Телефон WhatsApp для кнопок «написать». Необязательная: пока художница
   * не прислала номер, кнопка просто не рисуется — это лучше, чем кнопка
   * с выдуманным телефоном или сборка, падающая из-за незаполненного поля.
   *
   * Формат проверяется здесь, потому что ошибка в нём не видна глазами:
   * ссылка wa.me с плюсом или пробелами открывается пустой перепиской.
   */
  NEXT_PUBLIC_WHATSAPP_PHONE: z
    .string()
    .regex(/^[0-9]{10,15}$/, {
      message: "только цифры, в международном формате без плюса и пробелов: 79991234567",
    })
    .optional(),
});

/**
 * NEXT_PUBLIC_* переменные Next подставляет в бандл только там, где они
 * написаны буквально. Поэтому здесь явный объект, а не спред process.env.
 */
const clientValues = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_WHATSAPP_PHONE: process.env.NEXT_PUBLIC_WHATSAPP_PHONE,
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
