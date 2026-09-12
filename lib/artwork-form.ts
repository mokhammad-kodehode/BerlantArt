import { z } from "zod";

import type { ArtworkInput, ArtworkStatus } from "@/lib/artworks";

/**
 * Разбор и проверка данных формы работы.
 *
 * Живёт отдельно от Server Action'а, потому что экшен помечен
 * `"use server"` и в тесте его не импортировать. А проверять тут есть что:
 * данные формы — чужой ввод, и ошибка в их разборе не видна глазами.
 * Ловушки, на которых уже спотыкались в этом проекте, покрыты тестами
 * в `lib/artwork-form.test.ts`.
 */

/**
 * Статусы в порядке, в котором они стоят в селекте.
 *
 * Порядок совпадает с объявлением в схеме Prisma не случайно
 * (.ai/rules/data.md): PostgreSQL сортирует enum в порядке объявления,
 * и галерея на это опирается. Полноту списка сверяет тест — `satisfies`
 * проверяет только то, что каждое значение существует, но не то,
 * что перечислены все.
 */
export const artworkStatuses = [
  "AVAILABLE",
  "RESERVED",
  "SOLD",
] as const satisfies readonly ArtworkStatus[];

/** Подписи статусов для админки. В отличие от витрины, здесь подписан
 * и AVAILABLE: в селекте не бывает варианта без названия. */
export const artworkStatusNames: Record<ArtworkStatus, string> = {
  AVAILABLE: "Доступна",
  RESERVED: "Забронирована",
  SOLD: "Продана",
};

/**
 * Значения полей как их набрал человек — строками, до всякой проверки.
 *
 * Возвращаются обратно в форму при ошибке: React 19 после Server Action
 * очищает форму целиком, и без этого одна опечатка в годе стирала бы
 * все девять полей. Поймано в Э6-1 на форме входа, где полей было два.
 */
export type ArtworkFormRaw = {
  title: string;
  description: string;
  category: string;
  technique: string;
  dimensions: string;
  year: string;
  price: string;
  status: string;
  featured: boolean;
};

/** Поля, у которых бывает своя ошибка под полем. */
export type ArtworkFieldErrors = Partial<Record<keyof ArtworkFormRaw, string>>;

/** Читает форму в строки. Отсутствующее поле — пустая строка, а не
 * `undefined`: дальше всё равно пришлось бы приводить, а `undefined`
 * в разметке превращает поле в неуправляемое. */
export function readArtworkForm(formData: FormData): ArtworkFormRaw {
  const text = (name: keyof ArtworkFormRaw): string => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  return {
    title: text("title"),
    description: text("description"),
    category: text("category"),
    technique: text("technique"),
    dimensions: text("dimensions"),
    year: text("year"),
    price: text("price"),
    status: text("status"),
    // Невыбранный флажок браузер не присылает вовсе — его отсутствие
    // и означает «нет», отдельного значения для этого не существует.
    featured: formData.get("featured") !== null,
  };
}

/**
 * Необязательный текст: пустая строка превращается в `null`.
 *
 * Именно `null`, а не `""` — это главное правило раздела о данных
 * (.ai/rules/content.md). Пустая строка в базе означает «техника: ничего»
 * и пролезает во все проверки на заполненность, тогда как `null` честно
 * говорит «неизвестно», и подпись под работой её молча пропустит.
 */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: не длиннее ${max} символов`)
    .transform((value) => (value === "" ? null : value));

/**
 * Необязательное целое число из текстового поля.
 *
 * Проверка регулярным выражением, а не `Number()`: тот принимает «12e3»,
 * «0x10» и « 7 » и превращает мусор в правдоподобное число, которое потом
 * уедет в базу. Ноль при этом обязан проходить — на нём ломается
 * привычное `if (value)`, и цена «0 ₽» превратилась бы в «цена не указана».
 */
const optionalInt = (options: { min: number; max: number; label: string }) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+$/.test(value), {
      message: `${options.label}: только целое число, без пробелов и знаков`,
    })
    .transform((value) => (value === "" ? null : Number(value)))
    .refine((value) => value === null || (value >= options.min && value <= options.max), {
      message: `${options.label}: допустимо от ${options.min} до ${options.max}`,
    });

/**
 * Верхняя граница года — текущий, а не «любой».
 *
 * Считается при каждом разборе, а не один раз при загрузке модуля:
 * сервер живёт месяцами, и зафиксированное на старте значение
 * в новогоднюю ночь начало бы отвергать правильный год.
 */
function currentYear(): number {
  return new Date().getFullYear();
}

function schema() {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, "Название обязательно — без него работу не найти в списке")
      .max(200, "Название: не длиннее 200 символов"),

    description: optionalText(4000, "Описание"),
    category: optionalText(100, "Категория"),
    technique: optionalText(100, "Техника"),
    dimensions: optionalText(100, "Размеры"),

    // Нижняя граница с запасом: художница пишет с 2020 года, но работа
    // может быть датирована и раньше, а вот 1899 — уже опечатка.
    year: optionalInt({ min: 1900, max: currentYear(), label: "Год" }),

    // Потолок цены — сто миллионов рублей. Не «разумная цена картины»,
    // а защита от лишнего нуля: 4 500 000 вместо 450 000 заметить трудно.
    price: optionalInt({ min: 0, max: 100_000_000, label: "Цена" }),

    status: z.enum(artworkStatuses, { message: "Неизвестный статус" }),
    featured: z.boolean(),
  });
}

export type ArtworkFormResult =
  { ok: true; data: ArtworkInput } | { ok: false; errors: ArtworkFieldErrors };

/**
 * Проверяет набранные значения и приводит их к виду, который ждёт база.
 *
 * Ошибки возвращаются по полям, а не одной строкой сверху: «Год: допустимо
 * от 1900 до 2026» под самим полем человек читает, а тот же текст над
 * формой из девяти полей заставляет искать, о чём речь.
 */
export function parseArtworkForm(raw: ArtworkFormRaw): ArtworkFormResult {
  const result = schema().safeParse(raw);

  if (result.success) return { ok: true, data: result.data };

  const errors: ArtworkFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    // Первая ошибка на поле важнее последующих: показываем её и не
    // перетираем следующей на то же поле.
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof ArtworkFormRaw] = issue.message;
    }
  }

  return { ok: false, errors };
}
