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
 * Категории работ — выбор из списка, а не свободный текст (Э6-6).
 *
 * Свободный текст давал «Горный пейзаж», «горы» и «Арх» как разные
 * категории, и каждая становилась отдельной кнопкой фильтра в галерее.
 * В базе категория — обычная строка, а не enum: новая категория
 * добавляется здесь одной строкой, без миграции. Порядок — порядок
 * в селекте. Список составлен по работам художницы, утверждён
 * заказчиком 19 сентября 2026.
 */
export const artworkCategories = [
  "Горы",
  "Башни",
  "Поле и дорога",
  "Деревья и лес",
  "Село",
  "Река и мост",
  "Цветы",
  "Старая архитектура",
  "Натюрморт",
  "Другое",
] as const;

/**
 * Стандартные размеры подрамников, от меньшего к большему.
 *
 * Без ориентации: 40 × 50 и 50 × 40 — один подрамник, повёрнут он или нет,
 * видно по фотографии. Размер не из списка вводится через `customSize`.
 */
export const artworkSizes = [
  "20 × 30 см",
  "30 × 30 см",
  "30 × 40 см",
  "40 × 40 см",
  "40 × 50 см",
  "40 × 60 см",
  "50 × 50 см",
  "50 × 60 см",
  "50 × 70 см",
  "60 × 60 см",
  "60 × 80 см",
  "70 × 90 см",
  "80 × 100 см",
  "90 × 120 см",
] as const;

/** Значение пункта «Другой размер» в селекте размера. */
export const customSize = "other";

/** Техника новой работы по умолчанию: со слов заказчика, у художницы
 * она всегда одна. Поле остаётся редактируемым ради исключений. */
export const defaultTechnique = "Холст, масло";

/** Первый год в списке: художница пишет с 2020 года. */
export const firstYear = 2020;

/**
 * Годы для селекта: от текущего вниз до `firstYear`.
 *
 * Функция, а не константа, по той же причине, что `currentYear()` ниже:
 * посчитанный при загрузке модуля список после Нового года не содержал бы
 * наступивший год.
 */
export function artworkYears(): number[] {
  const years: number[] = [];
  for (let year = currentYear(); year >= firstYear; year--) years.push(year);
  return years;
}

/** Есть ли значение в списке. Отдельная функция, потому что `includes`
 * у кортежа `as const` не принимает произвольную строку. */
export function isListed(list: readonly string[], value: string): boolean {
  return list.includes(value);
}

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
  /** Значение селекта: размер из `artworkSizes`, `customSize` или пусто. */
  dimensions: string;
  /** Текст поля «Другой размер»; учитывается, только если выбран `customSize`. */
  dimensionsCustom: string;
  year: string;
  price: string;
  status: string;
  featured: boolean;
};

/** Поля, у которых бывает своя ошибка под полем. */
export type ArtworkFieldErrors = Partial<Record<keyof ArtworkFormRaw, string>>;

/**
 * Значения новой работы. Пусто всё, кроме техники, статуса, года и флага
 * главной. Решения заказчика от 19 сентября 2026:
 *
 * - «Показывать на главной» включён: новая работа сразу попадает на главную
 *   и на «О художнице», вытесняя самую старую из отмеченных;
 * - год — текущий. Это отступление от правила «не выдумывать фактов»
 *   (ARCHITECTURE.md, «Решения списков в форме работы»): у старой картины,
 *   если год не сменить руками, на сайте окажется неверный год.
 *
 * Функция, а не константа, по той же причине, что `artworkYears()`:
 * сервер живёт месяцами, и посчитанный при запуске год после Нового года
 * стал бы прошлогодним.
 */
export function newArtworkValues(): ArtworkFormRaw {
  return {
    title: "",
    description: "",
    category: "",
    technique: defaultTechnique,
    dimensions: "",
    dimensionsCustom: "",
    year: String(currentYear()),
    price: "",
    status: "AVAILABLE",
    featured: true,
  };
}

/**
 * Размер из базы — в пару полей формы: стандартный размер уходит
 * в селект, любой другой — в «Другой размер» своим текстом.
 */
export function dimensionsFields(
  value: string | null,
): Pick<ArtworkFormRaw, "dimensions" | "dimensionsCustom"> {
  if (value === null || value === "") return { dimensions: "", dimensionsCustom: "" };
  if (isListed(artworkSizes, value)) return { dimensions: value, dimensionsCustom: "" };
  return { dimensions: customSize, dimensionsCustom: value };
}

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
    dimensionsCustom: text("dimensionsCustom"),
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

/**
 * Необязательный выбор из списка: пусто — `null`, иначе только значение
 * из списка. Проверка на сервере, а не только селектом: запрос можно
 * отправить и в обход формы.
 */
const optionalListed = (list: readonly string[], message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || isListed(list, value), { message })
    .transform((value) => (value === "" ? null : value));

/**
 * Размер: пара «значение селекта + текст другого размера» превращается
 * в одну строку для базы. Своё поле в схеме, а не проверка всей формы
 * целиком: та в zod запускается, только когда остальные поля уже верны,
 * и ошибка размера всплывала бы лишь со второй попытки.
 */
const dimensionsField = z
  .object({ choice: z.string(), custom: z.string() })
  .transform((value, ctx) => {
    if (value.choice === "") return null;

    if (value.choice === customSize) {
      const custom = value.custom.trim();
      const message =
        custom === ""
          ? "Впишите размер или выберите его из списка"
          : custom.length > 100
            ? "Размер: не длиннее 100 символов"
            : null;
      if (message === null) return custom;

      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }

    if (isListed(artworkSizes, value.choice)) return value.choice;

    ctx.addIssue({ code: "custom", message: "Выберите размер из списка" });
    return z.NEVER;
  });

function schema() {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, "Название обязательно — без него работу не найти в списке")
      .max(200, "Название: не длиннее 200 символов"),

    description: optionalText(4000, "Описание"),
    category: optionalListed(artworkCategories, "Выберите категорию из списка"),
    technique: optionalText(100, "Техника"),
    dimensions: dimensionsField,

    // Те же границы, что у селекта: раньше 2020 года художница не писала,
    // а будущий год — опечатка.
    year: optionalInt({ min: firstYear, max: currentYear(), label: "Год" }),

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
 * от 2020 до 2026» под самим полем человек читает, а тот же текст над
 * формой из девяти полей заставляет искать, о чём речь.
 */
export function parseArtworkForm(raw: ArtworkFormRaw): ArtworkFormResult {
  const result = schema().safeParse({
    ...raw,
    dimensions: { choice: raw.dimensions, custom: raw.dimensionsCustom },
  });

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
