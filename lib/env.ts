import { z } from "zod";

/**
 * Валидация переменных окружения на старте приложения.
 *
 * Смысл: упасть при сборке с понятной ошибкой, а не в рантайме на проде
 * с `undefined` в строке подключения.
 *
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
   * Публичный домен бакета R2, с него отдаются фотографии работ.
   *
   * Необязательная, и это осознанно: пока хранилище не подключено, в базе
   * нет ни одной картинки с ключом, а старые пять лежат в public/ и адрес
   * бакета им не нужен. Сделать переменную обязательной значило бы уронить
   * сборку публичного сайта из-за админской функции, которой у него ещё нет.
   */
  NEXT_PUBLIC_R2_PUBLIC_URL: z.url().optional(),

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
  NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
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

/**
 * Текст ошибки настройки — для показа тому, кто настраивает сайт.
 *
 * Сообщения parse() называют переменную и причину («не похоже на хеш»),
 * но не значения: показать их на экране можно. Раньше такие ошибки уходили
 * только в логи хостинга, и владелец сайта после каждой попытки лез туда —
 * форма входа и загрузка фотографий теперь говорят сразу.
 *
 * Переводы строк схлопываются: текст встаёт в одну строку интерфейса.
 */
export function describeConfigError(error: unknown): string {
  return error instanceof Error ? error.message.replace(/\s*\n\s*/g, " ") : "";
}

export const serverEnv = parse(serverSchema, process.env, "сервер");
export const clientEnv = parse(clientSchema, clientValues, "клиент");

/**
 * Ключи к хранилищу R2.
 *
 * Проверяются отдельной схемой и лениво — при первом обращении к хранилищу,
 * а не при старте приложения. Причина: публичный сайт хранилищем не
 * пользуется (картинки ему отдаёт оптимизатор), и требовать эти переменные
 * при сборке значит не давать задеплоить весь сайт из-за админской функции.
 *
 * Ошибка при этом не теряется: первая же попытка подписать загрузку без
 * заполненных ключей падает с тем же понятным текстом, что и остальные.
 */
const r2Schema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

let r2Values: z.infer<typeof r2Schema> | null = null;

/** Проверенные ключи хранилища. Разбираются один раз и запоминаются. */
export function r2Env(): z.infer<typeof r2Schema> {
  r2Values ??= parse(r2Schema, process.env, "хранилище R2");
  return r2Values;
}

/**
 * Учётные данные администратора и секрет для подписи сессий.
 *
 * Проверяются лениво, тем же приёмом и по той же причине, что ключи R2:
 * публичный сайт входом в админку не пользуется, и требовать эти переменные
 * при сборке значит не давать выложить галерею из-за админской функции.
 *
 * Пароля здесь нет — только его хеш. Сам пароль не хранится нигде
 * (.ai/rules/security.md).
 */
const authSchema = z.object({
  /** Секрет для подписи куки сессии. Генерируется командой
   * `node scripts/hash-password.mjs --secret`. */
  AUTH_SECRET: z.string().min(32, {
    message: "нужен длинный случайный секрет: node scripts/hash-password.mjs --secret",
  }),

  AUTH_ADMIN_EMAIL: z.email(),

  /**
   * Формат из lib/password.ts: `scrypt:<соль 32 hex>:<ключ 128 hex>`.
   *
   * Проверяется здесь, потому что опечатка в хеше иначе всплыла бы как
   * «пароль не подходит», и искать её стали бы в пароле, а не в переменной.
   */
  AUTH_ADMIN_PASSWORD_HASH: z.string().regex(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/, {
    message: "не похоже на хеш: сгенерируй его командой node scripts/hash-password.mjs",
  }),
});

let authValues: z.infer<typeof authSchema> | null = null;

/** Проверенные учётные данные администратора. Разбираются один раз. */
export function authEnv(): z.infer<typeof authSchema> {
  authValues ??= parse(authSchema, process.env, "админка");
  return authValues;
}
