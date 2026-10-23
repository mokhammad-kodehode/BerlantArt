import type { UiDictionary } from "@/lib/i18n/ru-ui";
import { z } from "@/lib/zod";

/**
 * Рамы примерочной (TICKETS-primerka.md): какие модели и покрытия можно
 * выбрать, как выбор живёт в адресе страницы, и размер холста.
 *
 * Выбор хранится в адресе, как фильтры галереи
 * ([architecture.md](../.ai/rules/architecture.md)): покупатель отправляет
 * ссылку в мессенджер — «смотри, в чёрной тонкой раме», — и у собеседника
 * открывается ровно то же.
 *
 * Рама устроена как в багетной мастерской: сначала модель — профиль,
 * ширина, материал, узор, — потом покрытие, и у каждой модели свой набор
 * покрытий. Деревянная рама бывает цвета дерева или окрашена так, как
 * такие рамы обычно красят (золото, белая, чёрная); металлическую тонкую
 * красят в любой цвет.
 *
 * Здесь данные и правила. Как рама выглядит — профиль, узор, свет по
 * сторонам — в lib/frame-look.ts: одно описание и для экрана (CSS), и для
 * снимка стены (canvas).
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

export type RoomFrame = (typeof frameIds)[number];
export type RoomFinish = (typeof finishIds)[number];

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
  /**
   * Насколько рама выступает от стены, в сантиметрах. Нужна объёмной
   * раме в камере телефона (AR-2); значения типовые, как и ширины.
   */
  depthCm: number;
  /** Допустимые покрытия. Первое — то, что выбирается вместе с моделью. */
  finishes: RoomFinish[];
};

/**
 * Модели — от тонкой к широкой. Ширины — типичные для каждого вида рам,
 * а не чьи-то конкретные артикулы: примерочная показывает, как выглядит
 * такая рама, а не продаёт её.
 */
const frameModels: Record<RoomFrame, Omit<FrameModel, "id">> = {
  none: {
    label: "Без рамы",
    note: "холст на подрамнике",
    widthCm: 0,
    gapCm: 0,
    depthCm: 0,
    finishes: [],
  },
  thin: {
    label: "Тонкая",
    note: "алюминий, гладкая",
    widthCm: 1.2,
    gapCm: 0,
    depthCm: 2.5,
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
    depthCm: 3.5,
    finishes: ["black", "white", "oak-light", "oak", "walnut", "wenge"],
  },
  modern: {
    label: "Модерн",
    note: "дерево, бусина у холста",
    widthCm: 4,
    gapCm: 0,
    depthCm: 3,
    finishes: ["oak", "oak-light", "walnut", "wenge", "cherry", "white", "black", "gold", "silver"],
  },
  reverse: {
    label: "Обратный профиль",
    note: "дерево, подъём к холсту",
    widthCm: 5,
    gapCm: 0,
    depthCm: 4,
    finishes: ["walnut", "oak", "wenge", "white", "black", "gold"],
  },
  classic: {
    label: "Классический багет",
    note: "дерево, резной поясок",
    widthCm: 7,
    gapCm: 0,
    depthCm: 4.5,
    finishes: ["gold", "old-gold", "silver", "bronze", "walnut", "black"],
  },
  baroque: {
    label: "Барокко",
    note: "дерево с лепниной, два пояса орнамента",
    widthCm: 10,
    gapCm: 0,
    depthCm: 6,
    finishes: ["old-gold", "gold", "silver", "bronze"],
  },
};

/** Пять тонов покрытия — от тени к блику: из них собран профиль рамы. */
export type FinishTones = {
  deep: string;
  shadow: string;
  mid: string;
  light: string;
  shine: string;
};

/** Покрытие: подпись, из чего оно — от этого зависит, видно ли волокно, — и тона. */
export type FrameFinish = {
  id: RoomFinish;
  label: string;
  kind: "wood" | "metal" | "paint";
  /**
   * Тона одни на экран, снимок и камеру: экран получает их переменными
   * CSS (lib/frame-look.ts), камера — только `mid`: рама в ней
   * одноцветная, узор рисует только примерочная.
   */
  tones: FinishTones;
};

const tones = (deep: string, shadow: string, mid: string, light: string, shine: string) => ({
  deep,
  shadow,
  mid,
  light,
  shine,
});

const finishText: Record<RoomFinish, Omit<FrameFinish, "id">> = {
  gold: {
    label: "Золото",
    kind: "metal",
    tones: tones("#2b1d0a", "#684a1b", "#a7803a", "#deba6c", "#fbeab3"),
  },
  "old-gold": {
    label: "Старое золото",
    kind: "metal",
    tones: tones("#231a0c", "#57401c", "#8a6e3a", "#b89a5e", "#d9c38a"),
  },
  silver: {
    label: "Серебро",
    kind: "metal",
    tones: tones("#1f2224", "#5b6166", "#9aa1a6", "#d2d7da", "#f5f7f8"),
  },
  bronze: {
    label: "Бронза",
    kind: "metal",
    tones: tones("#22150b", "#5a3a1f", "#8f6238", "#b98a5a", "#dcb88c"),
  },
  "oak-light": {
    label: "Светлый дуб",
    kind: "wood",
    tones: tones("#7a5a35", "#b08b5c", "#cfae80", "#e2c8a0", "#f0dfc0"),
  },
  oak: {
    label: "Дуб",
    kind: "wood",
    tones: tones("#5a3c22", "#8c6440", "#b88e5e", "#d6b182", "#e8cfa8"),
  },
  walnut: {
    label: "Орех",
    kind: "wood",
    tones: tones("#2a1a10", "#4a2f1e", "#6b4630", "#8a5f43", "#a87b5c"),
  },
  wenge: {
    label: "Венге",
    kind: "wood",
    tones: tones("#140e0b", "#2a1e18", "#3c2c24", "#54402f", "#6d5543"),
  },
  cherry: {
    label: "Вишня",
    kind: "wood",
    tones: tones("#3a150c", "#6b2a17", "#8f3e22", "#b3593a", "#cc7a5a"),
  },
  white: {
    label: "Белая",
    kind: "paint",
    tones: tones("#b7b1a8", "#d8d3cb", "#ece8e1", "#f7f5f1", "#ffffff"),
  },
  black: {
    label: "Чёрная",
    kind: "paint",
    tones: tones("#050505", "#141414", "#1d1d1d", "#333333", "#4a4a4a"),
  },
  graphite: {
    label: "Графит",
    kind: "paint",
    tones: tones("#1c1d1f", "#34363a", "#4a4d52", "#62666c", "#7d8187"),
  },
  navy: {
    label: "Тёмно-синяя",
    kind: "paint",
    tones: tones("#0c1424", "#16233d", "#213257", "#2e4470", "#45598a"),
  },
  burgundy: {
    label: "Бордовая",
    kind: "paint",
    tones: tones("#250a0e", "#43131a", "#5e1c25", "#7a2733", "#96394a"),
  },
  olive: {
    label: "Оливковая",
    kind: "paint",
    tones: tones("#1f2213", "#3a3f22", "#545a33", "#6d7446", "#899060"),
  },
};

export const roomFrames: FrameModel[] = frameIds.map((id) => ({ id, ...frameModels[id] }));

export function frameModel(id: RoomFrame): FrameModel {
  return { id, ...frameModels[id] };
}

export function frameFinish(id: RoomFinish): FrameFinish {
  return { id, ...finishText[id] };
}

/** Выбор рамы: модель и покрытие. */
export type FrameChoice = { frame: RoomFrame; finish: RoomFinish };

/**
 * Что открывается без параметров: картина без рамы — с 9 октября 2026
 * (заказчик): сначала человек видит саму картину, а раму примеряет, если
 * захочет. Покрытие «золото» хранится и у «без рамы»: выберешь раму —
 * она сразу золотая.
 */
export const defaultFrameChoice: FrameChoice = { frame: "none", finish: "gold" };

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

function defaultFinish(frame: RoomFrame): RoomFinish {
  return frameModels[frame].finishes[0] ?? defaultFrameChoice.finish;
}

/**
 * Разбор адреса. Мусор — «?frame=purple» из опечатки или старой ссылки —
 * молча откатывается к значению по умолчанию: примерочная не должна падать
 * из-за чужой ссылки. Параметры старой примерочной (wall, light, sofa)
 * просто не читаются.
 */
const choiceSchema = z.object({
  frame: z.enum(frameIds).catch(defaultFrameChoice.frame),
  finish: z.enum(finishIds).optional().catch(undefined),
});

type RawParams = Record<string, string | string[] | null | undefined>;

export function parseFrameChoice(params: RawParams): FrameChoice {
  // Повторённый параметр (?frame=a&frame=b) Next отдаёт массивом — берём первый.
  const first = (value: RawParams[string]) =>
    (Array.isArray(value) ? value[0] : value) ?? undefined;

  const parsed = choiceSchema.parse({ frame: first(params.frame), finish: first(params.finish) });

  // Без покрытия в адресе — основное покрытие модели; с неподходящим —
  // тоже оно: «тонкая рама, орех» такой рамы не бывает.
  return {
    frame: parsed.frame,
    finish: finishFor(parsed.frame, parsed.finish ?? defaultFinish(parsed.frame)),
  };
}

/**
 * Хвост адреса для выбора: только то, что отличается от умолчаний, — так
 * ссылка без изменений остаётся чистой, а «?frame=classic&finish=gold»
 * не расползается по мессенджерам. Покрытие пишется, только если оно
 * не основное для модели. Пустая строка, если менять нечего.
 */
export function frameQuery(choice: FrameChoice): string {
  const params = new URLSearchParams();
  if (choice.frame !== defaultFrameChoice.frame) params.set("frame", choice.frame);
  if (choice.frame !== "none" && choice.finish !== defaultFinish(choice.frame)) {
    params.set("finish", choice.finish);
  }

  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/** Две стороны подрамника в сантиметрах — без ориентации, как в базе. */
export type CanvasSides = { short: number; long: number };

/**
 * Размер холста одной строкой: два числа через «×», «x», «х», «*», «/»
 * или «на», с «см» или без. «/» и «на» — так размер вписывают от руки
 * в «Другой размер»: «120/120» сайт прежде не узнавал, и у такой картины
 * не было ни камеры, ни дивана для масштаба (заказчик, 23.10.2026).
 */
const canvasSizePattern =
  /^\s*(\d+(?:[.,]\d+)?)\s*(?:[×xх*/]|на)\s*(\d+(?:[.,]\d+)?)\s*(?:см\.?)?\s*$/i;

/**
 * Размер в том виде, что в списке админки: «120/120» → «120 × 120 см».
 * Порядок сторон — как вписал человек. Строку, в которой размер не
 * прочитать, возвращает как есть: додумывать за художницу нельзя.
 */
export function normalizeCanvasSize(text: string): string {
  const match = canvasSizePattern.exec(text);
  return match === null ? text.trim() : `${match[1]} × ${match[2]} см`;
}

/**
 * Стороны холста из строки размера: «50 × 60 см», «50x60», «120/120».
 *
 * null, если строку нельзя прочитать уверенно — нет двух чисел или единица
 * не сантиметры. Лучше не дать примерить, чем показать картину не того
 * размера: покупатель по ней решает, впишется ли холст в его комнату
 * ([content.md](../.ai/rules/content.md)).
 *
 * Ориентации в базе нет (artworkSizes): «40 × 50» — один подрамник, как
 * его ни поверни. Какая сторона ширина, решает форма фотографии.
 */
export function parseCanvasSides(text: string | null): CanvasSides | null {
  if (text === null) return null;

  const match = canvasSizePattern.exec(text);
  if (match === null) return null;

  const [first, second] = [match[1], match[2]].map((side) => Number(side.replace(",", ".")));
  if (!(first > 0 && second > 0)) return null;

  return { short: Math.min(first, second), long: Math.max(first, second) };
}

/**
 * Холст на стене: ширина и высота в сантиметрах — уже с ориентацией,
 * которую дала фотография (lib/ar-model.ts, canvasPlacement).
 */
export type CanvasCm = { width: number; height: number };

/** То же, что `framedSides`, но с ориентацией: сколько картина в раме займёт на стене. */
export function framedCanvas(canvas: CanvasCm, frame: RoomFrame): CanvasCm {
  const { widthCm, gapCm } = frameModels[frame];
  const add = 2 * (widthCm + gapCm);
  return { width: Math.round(canvas.width + add), height: Math.round(canvas.height + add) };
}

/** «80 × 100 см» — ширина на высоту, как их меряют на стене. */
export function canvasCmText(canvas: CanvasCm, cm: string): string {
  return `${canvas.width} × ${canvas.height} ${cm}`;
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

/** Картина в сообщении художнице: название, рама и ссылка на неё. */
export type MessageWork = { title: string; choice: FrameChoice; url: string };

/**
 * Текст для WhatsApp из примерочной: какие работы и в каких рамах
 * смотрели и где — через камеру или на фото своей стены. Художница сразу
 * видит, что понравилось, и может предложить раму, если делает их на заказ.
 *
 * Текст — на языке страницы: из английской версии пишут по-английски.
 * Строки передаёт сама примерочная (`useDictionary().room`), а не берёт
 * функция по языку: иначе в браузер ушёл бы полный словарь обоих языков —
 * функция работает в клиентском компоненте (тикет О-12).
 */
export function fittingMessage({
  works,
  place,
  t,
}: {
  works: readonly MessageWork[];
  place: "camera" | "photo";
  /** Строки примерочной на языке страницы. */
  t: UiDictionary["room"];
}): string {
  const items = works
    .map(({ title, choice }) => {
      const framing =
        choice.frame === "none"
          ? t.messageNoFrame
          : t.messageFramed(t.frames[choice.frame].label, t.finishes[choice.finish]);
      return t.messageWork(title, framing);
    })
    .join("; ");
  const links = works.map((work) => work.url).join(" ");
  // «Смотрю…», а не «примерял»: без рода — пишут и мужчины, и женщины.
  return t.message(place === "camera" ? t.messageCamera : t.messagePhoto, items, links);
}
