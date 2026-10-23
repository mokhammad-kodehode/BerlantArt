/**
 * Стена на фотографии (TICKETS-primerka.md, П-2): как сантиметры на стене
 * переводятся в точки фото и обратно.
 *
 * Человек отмечает четыре угла прямоугольника, размер которого знает, —
 * лист А4, дверь, — и вписывает размер (решение 5, по идее Smartist).
 * Четыре пары «угол в сантиметрах — угол на фото» однозначно задают
 * перспективное преобразование плоскости стены (гомографию): матрицу 3×3,
 * по которой любая точка стены находит своё место на снимке. Из неё
 * же — масштаб и наклон стены в любой точке.
 *
 * Картина ложится на фото по наклону стены в своей середине
 * (`localAffine`) — параллелограммом, без сужения дальнего края
 * (решение 7): так её можно нарисовать одним преобразованием canvas,
 * без нарезки на треугольники, а на снимке, сделанном почти прямо,
 * разницы не видно.
 *
 * Чистая математика, без браузера: её проверяет тест.
 */

export type Point = { x: number; y: number };

/** Четыре угла по часовой стрелке: левый верхний, правый верхний, правый нижний, левый нижний. */
export type Quad = readonly [Point, Point, Point, Point];

/** Матрица 3×3 построчно. */
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Преобразование canvas: x' = a·x + c·y + e, y' = b·x + d·y + f — порядок setTransform. */
export type Affine = { a: number; b: number; c: number; d: number; e: number; f: number };

/** Стена: из сантиметров в точки фото и обратно. */
export type WallPlane = { toPhoto: Matrix3; toWall: Matrix3 };

/**
 * Решение системы линейных уравнений методом Гаусса с выбором главного
 * элемента. null — система вырождена: три угла на одной прямой.
 */
function solve(matrix: number[][], values: number[]): number[] | null {
  const n = values.length;
  const rows = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-12) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];

    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column] / rows[column][column];
      for (let k = column; k <= n; k += 1) rows[row][k] -= factor * rows[column][k];
    }
  }

  return rows.map((row, index) => row[n] / row[index]);
}

/**
 * Гомография, переводящая четыре точки `from` в четыре точки `to`.
 * null, если углы не образуют четырёхугольник (три на одной прямой).
 */
export function homography(from: Quad, to: Quad): Matrix3 | null {
  const matrix: number[][] = [];
  const values: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    const { x, y } = from[index];
    const { x: u, y: v } = to[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  }

  const h = solve(matrix, values);
  if (h === null) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function applyHomography(m: Matrix3, { x, y }: Point): Point {
  const w = m[6] * x + m[7] * y + m[8];
  return { x: (m[0] * x + m[1] * y + m[2]) / w, y: (m[3] * x + m[4] * y + m[5]) / w };
}

/** Обратная матрица. null — вырожденная. */
export function invert(m: Matrix3): Matrix3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  return [
    A / det,
    -(b * i - c * h) / det,
    (b * f - c * e) / det,
    B / det,
    (a * i - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * h - b * g) / det,
    (a * e - b * d) / det,
  ];
}

/**
 * Стена по мерке: четыре угла прямоугольника на фото (по часовой
 * стрелке от левого верхнего) и его настоящий размер в сантиметрах.
 * Начало сантиметров — левый верхний угол мерки, ось Y — вниз, как на
 * фото. null — углы отмечены так, что четырёхугольника нет.
 */
export function wallFromCorners(
  corners: Quad,
  size: { width: number; height: number },
): WallPlane | null {
  const rect: Quad = [
    { x: 0, y: 0 },
    { x: size.width, y: 0 },
    { x: size.width, y: size.height },
    { x: 0, y: size.height },
  ];
  const toPhoto = homography(rect, corners);
  const toWall = toPhoto === null ? null : invert(toPhoto);
  if (toPhoto === null || toWall === null) return null;
  return { toPhoto, toWall };
}

/**
 * Стена «на глаз»: фото снято прямо, на сантиметр приходится `pxPerCm`
 * точек, а ноль сантиметров — в точке `origin` фото (середина снимка:
 * тогда ползунок масштаба растит картины от середины, а не от угла).
 * Масштаб человек подгоняет сам; картины между собой всё равно честные —
 * их размеры из базы.
 */
export function frontalWall(pxPerCm: number, origin: Point = { x: 0, y: 0 }): WallPlane {
  return {
    toPhoto: [pxPerCm, 0, origin.x, 0, pxPerCm, origin.y, 0, 0, 1],
    toWall: [1 / pxPerCm, 0, -origin.x / pxPerCm, 0, 1 / pxPerCm, -origin.y / pxPerCm, 0, 0, 1],
  };
}

/**
 * Наклон и масштаб стены в точке `at` (сантиметры): преобразование,
 * которое переводит сантиметры вокруг этой точки в точки фото. Это
 * производная гомографии — касательная плоскость к перспективе.
 * Сдвиг (e, f) — место самой точки на фото.
 */
export function localAffine(plane: WallPlane, at: Point): Affine {
  const m = plane.toPhoto;
  const w = m[6] * at.x + m[7] * at.y + m[8];
  const { x: u, y: v } = applyHomography(m, at);
  return {
    a: (m[0] - u * m[6]) / w,
    b: (m[3] - v * m[6]) / w,
    c: (m[1] - u * m[7]) / w,
    d: (m[4] - v * m[7]) / w,
    e: u,
    f: v,
  };
}

/** Точка через преобразование canvas. */
export function applyAffine(t: Affine, { x, y }: Point): Point {
  return { x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f };
}

/** Внутри ли точка выпуклого четырёхугольника (углы по порядку обхода). */
export function isInsideQuad(quad: Quad, point: Point): boolean {
  let sign = 0;
  for (let index = 0; index < 4; index += 1) {
    const a = quad[index];
    const b = quad[(index + 1) % 4];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/**
 * Выпуклый ли четырёхугольник и обходится ли он по часовой стрелке
 * на экране (ось Y вниз). Мерку с перекрещенными углами — «бантиком» —
 * считать нельзя: картина вывернулась бы наизнанку.
 */
export function isConvexClockwise(quad: Quad): boolean {
  for (let index = 0; index < 4; index += 1) {
    const a = quad[index];
    const b = quad[(index + 1) % 4];
    const c = quad[(index + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross <= 0) return false;
  }
  return true;
}
