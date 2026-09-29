import {
  frameFinish,
  frameModel,
  type CanvasSides,
  type RoomFinish,
  type RoomFrame,
} from "@/lib/room-options";
import type { Size } from "@/lib/prepare-image";

/**
 * Картина в раме как объёмная модель для камеры телефона (AR-2,
 * TICKETS-ar.md). Здесь только геометрия и материалы — одна сцена на оба
 * формата: GLB пишет lib/glb.ts, USDZ — lib/usdz.ts. Две записи одной
 * сцены не разойдутся ни в размере, ни в цвете.
 *
 * Единицы — метры, ось Y вверх, лицом к +Z: так ждут и Scene Viewer
 * на Android, и AR Quick Look на iPhone. Задник модели лежит в z = 0 —
 * эта плоскость прижимается к стене.
 */

/** Холст на стене: стороны в метрах, уже повёрнутые по фотографии. */
export type CanvasPlacement = { widthM: number; heightM: number };

/**
 * На сколько форма фото может разойтись с формой холста. Фото кадрируют
 * по краю холста, но неровно; больше 8% — это уже другой размер в базе
 * или не та фотография, и в камере картина вышла бы растянутой.
 */
export const maxShapeMismatch = 0.08;

/**
 * Какая сторона холста ширина — решает форма фото: размер в базе хранится
 * без ориентации. null, если фото и холст расходятся по форме больше
 * `maxShapeMismatch`: тогда кнопки камеры нет, чтобы покупатель не увидел
 * картину не того размера.
 */
export function canvasPlacement(sides: CanvasSides, photo: Size): CanvasPlacement | null {
  if (!(photo.width > 0 && photo.height > 0)) return null;

  const isPortrait = photo.height > photo.width;
  const [width, height] = isPortrait ? [sides.short, sides.long] : [sides.long, sides.short];

  const mismatch = Math.abs(photo.width / photo.height / (width / height) - 1);
  if (mismatch > maxShapeMismatch) return null;

  return { widthM: width / 100, heightM: height / 100 };
}

/** Толщина подрамника. Оформление модели, а не факт о картине: в базе её нет. */
export const canvasDepthM = 0.02;

export type Vec3 = [number, number, number];

/** Цвет в линейном пространстве, каждая доля 0…1 — так его ждут оба формата. */
export type LinearColor = [number, number, number];

export type ArMaterial = {
  name: string;
  color: LinearColor;
  metallic: number;
  roughness: number;
  /** Лицо холста: цвет берётся из фотографии, `color` её не тонирует (белый). */
  hasPhoto: boolean;
};

/**
 * Часть модели с одним материалом. Вершины не общие: у каждого
 * треугольника свои, чтобы грани рамы были плоскими, а не заглаженными.
 */
export type ArPart = {
  name: string;
  material: ArMaterial;
  positions: number[];
  normals: number[];
  /** Только у лица холста. Начало — левый верхний угол фото, как в glTF. */
  uvs?: number[];
  indices: number[];
};

export type ArScene = { parts: ArPart[]; min: Vec3; max: Vec3 };

/**
 * Сечение рамы: точки (отступ от внешнего края, высота над стеной)
 * в сантиметрах, от задника у внешнего края к заднику у холста. Сечение
 * выпуклое — на этом держится выбор стороны грани в `addQuad`.
 *
 * Ширина и высота каждого сечения совпадают с `widthCm` и `depthCm`
 * модели в room-options.ts (сверяет тест). Узор, резьбы и лепнины нет —
 * это решение 5 разбора: верны размер, скос и покрытие.
 */
const frameProfiles: Record<Exclude<RoomFrame, "none">, [number, number][]> = {
  thin: [
    [0, 0],
    [0, 2.5],
    [1, 2.5],
    [1.2, 2.3],
    [1.2, 0],
  ],
  floater: [
    [0, 0],
    [0, 3.5],
    [1.5, 3.5],
    [1.5, 0],
  ],
  // Бусина у холста — скруглённый край, здесь скошенный.
  modern: [
    [0, 0],
    [0, 3],
    [3.2, 3],
    [4, 2.2],
    [4, 0],
  ],
  // Обратный профиль поднимается к холсту.
  reverse: [
    [0, 0],
    [0, 2.5],
    [4.4, 4],
    [5, 3.4],
    [5, 0],
  ],
  // Классика и барокко — гребень у внешнего края и спуск к холсту.
  classic: [
    [0, 0],
    [0, 4],
    [0.8, 4.5],
    [5.5, 3.2],
    [7, 2.2],
    [7, 0],
  ],
  baroque: [
    [0, 0],
    [0, 5],
    [1.2, 6],
    [3, 5.6],
    [8, 3.6],
    [10, 2.4],
    [10, 0],
  ],
};

export function frameProfile(frame: Exclude<RoomFrame, "none">): [number, number][] {
  return frameProfiles[frame];
}

/**
 * Цвет из CSS (sRGB) в линейный. Оба формата считают свет в линейном
 * пространстве: без перевода золото в камере вышло бы заметно светлее
 * и бледнее, чем в примерочной.
 */
export function linearColor(hex: string): LinearColor {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) throw new Error(`Цвет «${hex}» не в виде #rrggbb — поправь room-options.ts.`);

  const [r, g, b] = [match[1], match[2], match[3]].map((part) => {
    const c = parseInt(part, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return [r, g, b];
}

/** Блеск по материалу покрытия: металл отражает, дерево и краска — матовые. */
const finishSurface = {
  metal: { metallic: 1, roughness: 0.35 },
  wood: { metallic: 0, roughness: 0.6 },
  paint: { metallic: 0, roughness: 0.5 },
} as const;

const photoMaterial: ArMaterial = {
  name: "Photo",
  color: [1, 1, 1],
  metallic: 0,
  roughness: 0.8,
  hasPhoto: true,
};

// Торцы холста — ровный серый. Какие они у картины на самом деле,
// неизвестно: закрашены или нет, — выдумывать не будем.
const canvasEdgeMaterial: ArMaterial = {
  name: "CanvasEdge",
  color: linearColor("#cfcbc4"),
  metallic: 0,
  roughness: 0.9,
  hasPhoto: false,
};

/** Тень в зазоре парящей рамы — подложка между холстом и коробом. */
const backingMaterial: ArMaterial = {
  name: "Backing",
  color: linearColor("#1a1918"),
  metallic: 0,
  roughness: 1,
  hasPhoto: false,
};

function emptyPart(name: string, material: ArMaterial): ArPart {
  return { name, material, positions: [], normals: [], indices: [] };
}

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Четырёхугольник двумя треугольниками. Порядок обхода — против часовой
 * стрелки, если смотреть снаружи: иначе телефон сочтёт грань задней
 * и не нарисует. Где «снаружи», говорит `outward` — любое направление
 * от тела наружу; углы при необходимости переставляются.
 */
function addQuad(part: ArPart, corners: [Vec3, Vec3, Vec3, Vec3], outward: Vec3, uvs?: number[]) {
  let [a, b, c, d] = corners;
  let normal = cross(subtract(b, a), subtract(c, a));
  if (dot(normal, outward) < 0) {
    [a, b, c, d] = [a, d, c, b];
    normal = [-normal[0], -normal[1], -normal[2]];
    if (uvs !== undefined) uvs = [uvs[0], uvs[1], uvs[6], uvs[7], uvs[4], uvs[5], uvs[2], uvs[3]];
  }

  const length = Math.hypot(...normal);
  // Вырожденная грань (у сечения два совпавших угла) — рисовать нечего.
  if (length === 0) return;

  const first = part.positions.length / 3;
  for (const corner of [a, b, c, d]) {
    part.positions.push(...corner);
    part.normals.push(normal[0] / length, normal[1] / length, normal[2] / length);
  }
  if (uvs !== undefined) (part.uvs ??= []).push(...uvs);
  part.indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
}

/** Коробка от `min` до `max`, каждая грань своим материалом по выбору `partFor`. */
function addBox(min: Vec3, max: Vec3, partFor: (face: "front" | "other") => ArPart) {
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;

  const faces: [Vec3, Vec3, Vec3, Vec3][] = [
    [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ],
    [
      [x0, y0, z0],
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y0, z0],
    ],
    [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
    ],
    [
      [x0, y1, z0],
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
    ],
    [
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
    ],
    [
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x1, y0, z1],
    ],
  ];

  faces.forEach((corners, index) => {
    // Середина грани — между противоположными углами.
    const [p, , q] = corners;
    const faceCenter: Vec3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    const outward = subtract(faceCenter, center);

    if (index === 0) {
      // Лицо: фото целиком, левый верхний угол фото — в левом верхнем углу холста.
      addQuad(partFor("front"), corners, outward, [0, 1, 1, 1, 1, 0, 0, 0]);
      return;
    }
    addQuad(partFor("other"), corners, outward);
  });
}

/**
 * Рама кольцом вокруг проёма: сечение протягивается вдоль каждой из
 * четырёх сторон, а углы режутся «на ус», под 45°, как в мастерской.
 * Точка сечения с отступом d лежит на прямоугольнике, ужатом на d
 * от внешнего края, — так скос в углах получается сам.
 */
function addFrame(part: ArPart, outerHalf: [number, number], profileCm: [number, number][]) {
  const profile = profileCm.map(([inset, height]) => [inset / 100, height / 100] as const);
  const centroid = profile
    .reduce((sum, [d, z]) => [sum[0] + d, sum[1] + z], [0, 0])
    .map((v) => v / profile.length);

  const [halfX, halfY] = outerHalf;

  // Сторона — направление наружу (ось и знак) и точка на ней по отступу и концу.
  const sides = [
    { axis: 1, sign: -1 },
    { axis: 0, sign: 1 },
    { axis: 1, sign: 1 },
    { axis: 0, sign: -1 },
  ] as const;

  for (const { axis, sign } of sides) {
    const at = (d: number, z: number, end: -1 | 0 | 1): Vec3 => {
      const x = halfX - d;
      const y = halfY - d;
      return axis === 1 ? [end * x, sign * y, z] : [sign * x, end * y, z];
    };
    const reference = at(centroid[0], centroid[1], 0);

    profile.forEach(([d, z], index) => {
      const [nextD, nextZ] = profile[(index + 1) % profile.length];
      const corners: [Vec3, Vec3, Vec3, Vec3] = [
        at(d, z, -1),
        at(d, z, 1),
        at(nextD, nextZ, 1),
        at(nextD, nextZ, -1),
      ];
      // Середина грани — на средней линии стороны, как и опорная точка:
      // разница между ними лежит в плоскости сечения и смотрит наружу.
      addQuad(part, corners, subtract(at((d + nextD) / 2, (z + nextZ) / 2, 0), reference));
    });
  }
}

/**
 * Модель картины: холст с фото на лице и, если выбрана, рама в покрытии.
 * Центр картины — в начале координат: куда человек ткнул на стене, туда
 * и встанет середина.
 */
export function buildPaintingScene({
  canvas,
  frame,
  finish,
}: {
  canvas: CanvasPlacement;
  frame: RoomFrame;
  finish: RoomFinish;
}): ArScene {
  const halfW = canvas.widthM / 2;
  const halfH = canvas.heightM / 2;

  const photo = emptyPart("Photo", photoMaterial);
  const edges = emptyPart("CanvasEdge", canvasEdgeMaterial);
  addBox([-halfW, -halfH, 0], [halfW, halfH, canvasDepthM], (face) =>
    face === "front" ? photo : edges,
  );

  const parts = [photo, edges];

  if (frame !== "none") {
    const { widthCm, gapCm } = frameModel(frame);
    const { kind, tone } = frameFinish(finish);
    const gap = gapCm / 100;
    const border = gap + widthCm / 100;

    const framePart = emptyPart("Frame", {
      name: "Frame",
      color: linearColor(tone),
      ...finishSurface[kind],
      hasPhoto: false,
    });
    addFrame(framePart, [halfW + border, halfH + border], frameProfiles[frame]);
    parts.push(framePart);

    if (gap > 0) {
      // Чуть впереди стены, чтобы не спорить с задником холста за один пиксель.
      const backing = emptyPart("Backing", backingMaterial);
      const z = 0.002;
      addQuad(
        backing,
        [
          [-halfW - gap, -halfH - gap, z],
          [halfW + gap, -halfH - gap, z],
          [halfW + gap, halfH + gap, z],
          [-halfW - gap, halfH + gap, z],
        ],
        [0, 0, 1],
      );
      parts.push(backing);
    }
  }

  return { parts, ...bounds(parts) };
}

function bounds(parts: ArPart[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const { positions } of parts) {
    for (let i = 0; i < positions.length; i++) {
      min[i % 3] = Math.min(min[i % 3], positions[i]);
      max[i % 3] = Math.max(max[i % 3], positions[i]);
    }
  }
  return { min, max };
}
