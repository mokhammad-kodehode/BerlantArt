import {
  frameFinish,
  frameModel,
  type FinishTones,
  type FrameChoice,
  type RoomFinish,
  type RoomFrame,
} from "@/lib/room-options";

/**
 * Как выглядит рама: профиль, узоры, волокно и свет по сторонам.
 *
 * Одно описание на два места (TICKETS-primerka.md, решение 9). На экране
 * раму рисует CSS (globals.css, блок «Рама»), получая всё это
 * переменными (`frameStyle`); на снимке своей стены — canvas
 * (lib/frame-canvas.ts). Разойтись им не из чего: числа здесь.
 *
 * Профиль — поперечный срез рамы от наружного края к холсту, записанный
 * тонами покрытия: где выпуклость — блик, где впадина — тень. Узоры
 * рисуются светом и тенью поверх тона, а не своим цветом, — поэтому один
 * узор годится для любого покрытия. Модель задаёт профиль и узор,
 * покрытие — тона.
 */

export type Tone = keyof FinishTones;

/** Полоса повторяющегося узора: цвет, от и до — в пикселях внутри периода. */
export type Stripe = readonly [color: string, from: number, to: number];

/** Узор: полосы, повторяющиеся с периодом — концом последней. */
export type Pattern = readonly Stripe[];

/** Пояс узора вдоль планки: где он лежит и какой он ширины — в долях планки. */
export type Band = { pattern: Pattern; size: number; pos: number };

export type FrameLook = { profile: readonly (readonly [Tone, number])[]; bands: readonly Band[] };

/** Бусины — ряд мелких выпуклостей, как у классического багета. */
const beads: Pattern = [
  ["rgb(0 0 0 / 0.55)", 0, 1.5],
  ["transparent", 1.5, 3],
  ["rgb(255 255 255 / 0.4)", 3, 4],
  ["transparent", 4, 7],
];

export const frameLooks: Record<Exclude<RoomFrame, "none">, FrameLook> = {
  /* Тонкая алюминиевая: плоская грань и одна острая полоса блика. */
  thin: {
    profile: [
      ["deep", 0],
      ["light", 0.18],
      ["shine", 0.3],
      ["mid", 0.55],
      ["shadow", 0.88],
      ["deep", 1],
    ],
    bands: [],
  },
  /* Парящая рама-короб: узкая плоская грань, холст висит внутри с зазором. */
  floater: {
    profile: [
      ["deep", 0],
      ["light", 0.12],
      ["mid", 0.35],
      ["mid", 0.8],
      ["shadow", 1],
    ],
    bands: [],
  },
  /* Модерн: ровная грань и бусина — узкий валик у самого холста. */
  modern: {
    profile: [
      ["deep", 0],
      ["mid", 0.1],
      ["light", 0.25],
      ["light", 0.55],
      ["mid", 0.72],
      ["shadow", 0.8],
      ["shine", 0.87],
      ["shadow", 0.94],
      ["deep", 1],
    ],
    bands: [],
  },
  /* Обратный профиль: рама поднимается к холсту, а не к стене, — картина
     будто выступает вперёд. */
  reverse: {
    profile: [
      ["deep", 0],
      ["shadow", 0.08],
      ["mid", 0.3],
      ["light", 0.62],
      ["shine", 0.82],
      ["light", 0.9],
      ["deep", 1],
    ],
    bands: [],
  },
  /* Классический багет: две выпуклости и резной поясок бусин. */
  classic: {
    profile: [
      ["deep", 0],
      ["mid", 0.05],
      ["shine", 0.12],
      ["light", 0.19],
      ["shadow", 0.31],
      ["mid", 0.42],
      ["light", 0.52],
      ["shadow", 0.71],
      ["mid", 0.8],
      ["shine", 0.86],
      ["shadow", 0.93],
      ["deep", 1],
    ],
    bands: [{ pattern: beads, size: 0.16, pos: 0.62 }],
  },
  /* Барокко: несколько выпуклостей, широкий пояс лиственного орнамента
     и ряд мелких бусин ближе к холсту. */
  baroque: {
    profile: [
      ["deep", 0],
      ["light", 0.04],
      ["shine", 0.09],
      ["mid", 0.15],
      ["shadow", 0.22],
      ["light", 0.3],
      ["shine", 0.36],
      ["mid", 0.44],
      ["shadow", 0.54],
      ["mid", 0.62],
      ["light", 0.7],
      ["shadow", 0.8],
      ["shine", 0.87],
      ["shadow", 0.94],
      ["deep", 1],
    ],
    bands: [
      {
        pattern: [
          ["rgb(0 0 0 / 0.5)", 0, 2],
          ["rgb(255 255 255 / 0.35)", 2, 4],
          ["transparent", 4, 7],
          ["rgb(0 0 0 / 0.3)", 7, 8],
          ["rgb(255 255 255 / 0.25)", 8, 10],
          ["transparent", 10, 15],
        ],
        size: 0.22,
        pos: 0.34,
      },
      {
        pattern: [
          ["rgb(0 0 0 / 0.5)", 0, 1],
          ["transparent", 1, 2],
          ["rgb(255 255 255 / 0.4)", 2, 3],
          ["transparent", 3, 5],
        ],
        size: 0.09,
        pos: 0.8,
      },
    ],
  },
};

/** Дерево: волокно вдоль планки — тонкие неровные линии. У металла и краски его нет. */
export const woodGrain: Pattern = [
  ["rgb(0 0 0 / 0.14)", 0, 1],
  ["transparent", 1, 3],
  ["rgb(255 255 255 / 0.08)", 3, 4],
  ["transparent", 4, 7],
  ["rgb(0 0 0 / 0.08)", 7, 8],
  ["transparent", 8, 12],
];

/** Дерево: крупный рисунок, меняющийся по длине планки. */
export const woodFigure: Pattern = [
  ["rgb(0 0 0 / 0.06)", 0, 13],
  ["transparent", 13, 31],
  ["rgb(255 255 255 / 0.05)", 31, 40],
  ["transparent", 40, 67],
];

/**
 * Свет на планках: он падает сверху и чуть слева — верхняя планка светлее
 * тона, нижняя заметно темнее. На экране — `filter: brightness()` у планок
 * в globals.css (сверяет тест), на снимке — тем же множителем.
 */
export const railLight = { top: 1.14, right: 0.88, bottom: 0.62, left: 0.94 } as const;

/** Узор строкой для repeating-linear-gradient. */
function patternCss(pattern: Pattern): string {
  return pattern.map(([color, from, to]) => `${color} ${from}px ${to}px`).join(", ");
}

const noPattern = "transparent 0 1px";

/**
 * Переменные CSS для атрибута style. Разметке lib/ не знает: компонент
 * сам кладёт их в style вместе со своими.
 */
export type CssVars = Record<`--${string}`, string | number>;

/** Тона покрытия переменными — для образцов рам и цветов. */
export function finishStyle(finish: RoomFinish): CssVars {
  const { tones } = frameFinish(finish);
  return {
    "--f-deep": tones.deep,
    "--f-shadow": tones.shadow,
    "--f-mid": tones.mid,
    "--f-light": tones.light,
    "--f-shine": tones.shine,
  };
}

/**
 * Всё, что нужно раме на экране, переменными CSS: ширина и зазор
 * в сантиметрах, тона, профиль, пояса узора и волокно. Размер в пикселях
 * CSS считает сам — от ширины холста на экране.
 */
export function frameStyle({ frame, finish }: FrameChoice): CssVars {
  const { widthCm, gapCm } = frameModel(frame);
  const base: CssVars = { ...finishStyle(finish), "--t-cm": widthCm, "--gap-cm": gapCm };
  if (frame === "none") return base;

  const look = frameLooks[frame];
  const { tones, kind } = frameFinish(finish);
  const [band1, band2] = look.bands;
  // Округление: 0.07 × 100 в числах с плавающей точкой — 7.000000000000001.
  const percent = (share = 0) => `${Math.round(share * 1000) / 10}%`;

  return {
    ...base,
    "--profile": look.profile.map(([tone, at]) => `${tones[tone]} ${percent(at)}`).join(", "),
    "--band1": band1 === undefined ? noPattern : patternCss(band1.pattern),
    "--band1-size": percent(band1?.size),
    "--band1-pos": percent(band1?.pos),
    "--band2": band2 === undefined ? noPattern : patternCss(band2.pattern),
    "--band2-size": percent(band2?.size),
    "--band2-pos": percent(band2?.pos),
    "--grain": kind === "wood" ? patternCss(woodGrain) : noPattern,
    "--figure": kind === "wood" ? patternCss(woodFigure) : noPattern,
  };
}
