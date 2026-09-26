import { z } from "zod";

/**
 * Примерочная: какие рамы, покрытия, стены и свет можно выбрать и как
 * выбор живёт в адресе страницы.
 *
 * Выбор хранится в адресе, как фильтры галереи
 * ([architecture.md](../.ai/rules/architecture.md)): покупатель отправляет
 * ссылку в мессенджер — «смотри, в чёрной раме на оливковой стене», —
 * и у собеседника открывается ровно то же.
 *
 * Рама устроена как в багетной мастерской: сначала модель — профиль,
 * ширина, материал, узор, — потом покрытие, и у каждой модели свой набор
 * покрытий. Деревянная рама бывает цвета дерева или окрашена так, как
 * такие рамы обычно красят (золото, белая, чёрная); металлическую тонкую
 * красят в любой цвет.
 *
 * Здесь только данные и правила. Как выглядит каждая рама, покрытие
 * и стена — в globals.css, блок «примерочная», по атрибутам data-frame,
 * data-finish и data-wall.
 */

const frameIds = ["none", "thin", "floater", "modern", "reverse", "classic", "baroque"] as const;
const finishIds = [
  "gold",
  "old-gold",
  "silver",
  "bronze",
  "oak-light",
  "oak",
  "walnut",
  "wenge",
  "cherry",
  "white",
  "black",
  "graphite",
  "navy",
  "burgundy",
  "olive",
] as const;
const wallIds = ["white", "beige", "grey", "olive", "terracotta", "graphite"] as const;
const lightIds = ["day", "evening"] as const;

export type RoomFrame = (typeof frameIds)[number];
export type RoomFinish = (typeof finishIds)[number];
export type RoomWall = (typeof wallIds)[number];
export type RoomLight = (typeof lightIds)[number];

/** Модель рамы — то, что в мастерской называют артикулом багета. */
export type FrameModel = {
  id: RoomFrame;
  label: string;
  /** Материал и узор — одной строкой, для подсказки. */
  note: string;
  /** Ширина лицевой части в сантиметрах. */
  widthCm: number;
  /** Зазор между холстом и рамой — только у парящей рамы-короба. */
  gapCm: number;
  /** Допустимые покрытия. Первое — то, что выбирается вместе с моделью. */
  finishes: RoomFinish[];
};

/**
 * Модели — от тонкой к широкой. Ширины — типичные для каждого вида рам,
 * а не чьи-то конкретные артикулы: примерочная показывает, как выглядит
 * такая рама, а не продаёт её.
 */
const frameModels: Record<RoomFrame, Omit<FrameModel, "id">> = {
  none: { label: "Без рамы", note: "холст на подрамнике", widthCm: 0, gapCm: 0, finishes: [] },
  thin: {
    label: "Тонкая",
    note: "алюминий, гладкая",
    widthCm: 1.2,
    gapCm: 0,
    finishes: [
      "black",
      "silver",
      "gold",
      "white",
      "graphite",
      "bronze",
      "navy",
      "burgundy",
      "olive",
    ],
  },
  floater: {
    label: "Парящая",
    note: "дерево, рама-короб с зазором",
    widthCm: 1.5,
    gapCm: 0.8,
    finishes: ["black", "white", "oak-light", "oak", "walnut", "wenge"],
  },
  modern: {
    label: "Модерн",
    note: "дерево, бусина у холста",
    widthCm: 4,
    gapCm: 0,
    finishes: ["oak", "oak-light", "walnut", "wenge", "cherry", "white", "black", "gold", "silver"],
  },
  reverse: {
    label: "Обратный профиль",
    note: "дерево, подъём к холсту",
    widthCm: 5,
    gapCm: 0,
    finishes: ["walnut", "oak", "wenge", "white", "black", "gold"],
  },
  classic: {
    label: "Классический багет",
    note: "дерево, резной поясок",
    widthCm: 7,
    gapCm: 0,
    finishes: ["gold", "old-gold", "silver", "bronze", "walnut", "black"],
  },
  baroque: {
    label: "Барокко",
    note: "дерево с лепниной, два пояса орнамента",
    widthCm: 10,
    gapCm: 0,
    finishes: ["old-gold", "gold", "silver", "bronze"],
  },
};

/** Покрытие: подпись и из чего оно — от этого зависит, видно ли волокно. */
export type FrameFinish = { id: RoomFinish; label: string; kind: "wood" | "metal" | "paint" };

const finishText: Record<RoomFinish, Omit<FrameFinish, "id">> = {
  gold: { label: "Золото", kind: "metal" },
  "old-gold": { label: "Старое золото", kind: "metal" },
  silver: { label: "Серебро", kind: "metal" },
  bronze: { label: "Бронза", kind: "metal" },
  "oak-light": { label: "Светлый дуб", kind: "wood" },
  oak: { label: "Дуб", kind: "wood" },
  walnut: { label: "Орех", kind: "wood" },
  wenge: { label: "Венге", kind: "wood" },
  cherry: { label: "Вишня", kind: "wood" },
  white: { label: "Белая", kind: "paint" },
  black: { label: "Чёрная", kind: "paint" },
  graphite: { label: "Графит", kind: "paint" },
  navy: { label: "Тёмно-синяя", kind: "paint" },
  burgundy: { label: "Бордовая", kind: "paint" },
  olive: { label: "Оливковая", kind: "paint" },
};

/** Шесть стен из реальных интерьеров — подобранные цвета выглядят лучше любого «любого». */
const wallText: Record<RoomWall, { label: string; phrase: string }> = {
  white: { label: "Белая", phrase: "на белой стене" },
  beige: { label: "Бежевая", phrase: "на бежевой стене" },
  grey: { label: "Серая", phrase: "на серой стене" },
  olive: { label: "Оливковая", phrase: "на оливковой стене" },
  terracotta: { label: "Терракотовая", phrase: "на терракотовой стене" },
  graphite: { label: "Графитовая", phrase: "на графитовой стене" },
};

const lightText: Record<RoomLight, string> = { day: "День", evening: "Вечер" };

export const roomFrames: FrameModel[] = frameIds.map((id) => ({ id, ...frameModels[id] }));
export const roomWalls = wallIds.map((id) => ({ id, label: wallText[id].label }));
export const roomLights = lightIds.map((id) => ({ id, label: lightText[id] }));

export function frameModel(id: RoomFrame): FrameModel {
  return { id, ...frameModels[id] };
}

export function frameFinish(id: RoomFinish): FrameFinish {
  return { id, ...finishText[id] };
}

export type RoomOptions = {
  frame: RoomFrame;
  /** Покрытие рамы. У «без рамы» не используется, но хранится — вернёшься к раме, цвет тот же. */
  finish: RoomFinish;
  wall: RoomWall;
  light: RoomLight;
  /** Диван для масштаба. Рисуется, только если размер холста известен. */
  hasSofa: boolean;
};

/**
 * Что открывается без параметров: классический золотой багет на тёплой
 * стене при дневном свете. Вечер с лампой был по умолчанию, пока заказчик
 * не попросил начинать со светлого: картину сначала хотят разглядеть,
 * а подсветку — включить потом.
 */
export const defaultRoomOptions: RoomOptions = {
  frame: "classic",
  finish: "gold",
  wall: "beige",
  light: "day",
  hasSofa: false,
};

/**
 * Покрытие, допустимое для модели: выбранное, если модель его знает, иначе
 * первое из её списка. Нужно при смене модели — у тонкой алюминиевой нет
 * «ореха», у барокко нет «тёмно-синего».
 */
export function finishFor(frame: RoomFrame, wanted: RoomFinish): RoomFinish {
  const allowed = frameModels[frame].finishes;
  if (allowed.length === 0 || allowed.includes(wanted)) return wanted;
  return allowed[0];
}

/**
 * Разбор адреса. Мусор — «?frame=purple» из опечатки или старой ссылки —
 * молча откатывается к значению по умолчанию: примерочная не должна падать
 * из-за чужой ссылки.
 */
const optionsSchema = z.object({
  frame: z.enum(frameIds).catch(defaultRoomOptions.frame),
  finish: z.enum(finishIds).optional().catch(undefined),
  wall: z.enum(wallIds).catch(defaultRoomOptions.wall),
  light: z.enum(lightIds).catch(defaultRoomOptions.light),
  sofa: z
    .string()
    .optional()
    .transform((value) => value === "1")
    .catch(false),
});

type RawParams = Record<string, string | string[] | undefined>;

export function parseRoomOptions(params: RawParams): RoomOptions {
  // Повторённый параметр (?frame=a&frame=b) Next отдаёт массивом — берём первый.
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const parsed = optionsSchema.parse({
    frame: first(params.frame),
    finish: first(params.finish),
    wall: first(params.wall),
    light: first(params.light),
    sofa: first(params.sofa),
  });

  // Без покрытия в адресе — основное покрытие модели; с неподходящим —
  // тоже оно: «тонкая рама, орех» такой рамы не бывает.
  const finish = finishFor(parsed.frame, parsed.finish ?? defaultFinish(parsed.frame));

  return {
    frame: parsed.frame,
    finish,
    wall: parsed.wall,
    light: parsed.light,
    hasSofa: parsed.sofa,
  };
}

function defaultFinish(frame: RoomFrame): RoomFinish {
  return frameModels[frame].finishes[0] ?? defaultRoomOptions.finish;
}

/**
 * Хвост адреса для выбора: только то, что отличается от умолчаний, — так
 * ссылка без изменений остаётся чистой, а «?frame=classic&finish=gold…»
 * не расползается по мессенджерам. Покрытие пишется, только если оно
 * не основное для модели. Пустая строка, если менять нечего.
 */
export function roomQuery(options: RoomOptions): string {
  const params = new URLSearchParams();
  if (options.frame !== defaultRoomOptions.frame) params.set("frame", options.frame);
  if (options.frame !== "none" && options.finish !== defaultFinish(options.frame)) {
    params.set("finish", options.finish);
  }
  if (options.wall !== defaultRoomOptions.wall) params.set("wall", options.wall);
  if (options.light !== defaultRoomOptions.light) params.set("light", options.light);
  if (options.hasSofa) params.set("sofa", "1");

  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/** Две стороны подрамника в сантиметрах — без ориентации, как в базе. */
export type CanvasSides = { short: number; long: number };

/**
 * Стороны холста из строки размера: «50 × 60 см», «50x60», «50 х 60 см».
 *
 * null, если строку нельзя прочитать уверенно — нет двух чисел или единица
 * не сантиметры. Лучше не показать диван, чем показать картину не того
 * размера: покупатель по нему решает, впишется ли она над его диваном
 * ([content.md](../.ai/rules/content.md)).
 *
 * Ориентации в базе нет (artworkSizes): «40 × 50» — один подрамник, как
 * его ни поверни. Какая сторона ширина, решает форма фотографии.
 */
export function parseCanvasSides(text: string | null): CanvasSides | null {
  if (text === null) return null;

  const match = /^\s*(\d+(?:[.,]\d+)?)\s*[×xх*]\s*(\d+(?:[.,]\d+)?)\s*(см)?\s*$/i.exec(text);
  if (match === null) return null;

  const [first, second] = [match[1], match[2]].map((side) => Number(side.replace(",", ".")));
  if (!(first > 0 && second > 0)) return null;

  return { short: Math.min(first, second), long: Math.max(first, second) };
}

/**
 * Размер картины в раме: к каждой стороне холста — две ширины рамы и два
 * зазора. Так считают в багетной мастерской, и это то, что покупателю
 * нужно знать, прикидывая место на стене. Округление до сантиметра:
 * миллиметры здесь — ложная точность, ширины рам типовые.
 */
export function framedSides(sides: CanvasSides, frame: RoomFrame): CanvasSides {
  const { widthCm, gapCm } = frameModels[frame];
  const add = 2 * (widthCm + gapCm);
  return { short: Math.round(sides.short + add), long: Math.round(sides.long + add) };
}

/**
 * Текст для WhatsApp из примерочной: какая работа и в каком виде её
 * смотрели. Художница сразу видит, что понравилось, и может предложить
 * раму, если делает их на заказ.
 */
export function roomMessage(title: string, options: RoomOptions, pageUrl: string): string {
  const framing =
    options.frame === "none"
      ? "без рамы"
      : `в раме «${frameModels[options.frame].label}», ${finishText[options.finish].label.toLowerCase()}`;
  // «Смотрю её…», а не «примерял»: без рода — пишут и мужчины, и женщины.
  return `Здравствуйте! Интересует работа «${title}». Смотрю её ${framing}, ${wallText[options.wall].phrase}. ${pageUrl}`;
}
