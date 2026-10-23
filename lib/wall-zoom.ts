import type { Point } from "@/lib/wall-plane";
import type { WallView } from "@/lib/wall-scene";

/**
 * Увеличение фото стены, пока отмечают углы мерки (заказчик, 23.10.2026,
 * макет «Мерка: фото крупнее»): на фото комнаты угол листа А4 — пара
 * миллиметров экрана, и палец его закрывает. Двумя пальцами, колесом мыши
 * или двойным касанием фото увеличивается; углы мерки хранятся в точках
 * фото, поэтому от увеличения не съезжают.
 *
 * Здесь только счёт — без событий и разметки: его проверяют тесты.
 */

type Size = { width: number; height: number };

/** Во сколько раз фото можно увеличить сверх «целиком в окне». */
export const maxZoom = 6;

/** Фото целиком в окне и по центру — вид без увеличения. */
export function fitView(photo: Size, box: Size): WallView {
  const scale = Math.min(box.width / photo.width, box.height / photo.height);
  return {
    scale,
    x: (box.width - photo.width * scale) / 2,
    y: (box.height - photo.height * scale) / 2,
  };
}

/**
 * Фото не уезжает за край: по стороне, где оно больше окна, края окна
 * остаются внутри фото, а где меньше — фото стоит по центру. Иначе
 * сбоку открывалась бы пустота, и было бы не понять, где кончается фото.
 */
export function clampView(view: WallView, photo: Size, box: Size): WallView {
  const axis = (offset: number, length: number, room: number): number =>
    length <= room ? (room - length) / 2 : Math.min(0, Math.max(room - length, offset));
  return {
    scale: view.scale,
    x: axis(view.x, photo.width * view.scale, box.width),
    y: axis(view.y, photo.height * view.scale, box.height),
  };
}

/**
 * Вид после увеличения в `factor` раз вокруг точки окна `at` и сдвига на
 * `pan`. Точка фото под пальцами остаётся под пальцами — так увеличивают
 * фото в любом телефоне. Мельче «целиком в окне» и крупнее `maxZoom` не
 * бывает.
 */
export function zoomView(
  view: WallView,
  { at, factor, pan = { x: 0, y: 0 } }: { at: Point; factor: number; pan?: Point },
  photo: Size,
  box: Size,
): WallView {
  const fit = fitView(photo, box).scale;
  const scale = Math.min(Math.max(view.scale * factor, fit), fit * maxZoom);
  const k = scale / view.scale;
  return clampView(
    { scale, x: at.x - (at.x - view.x) * k + pan.x, y: at.y - (at.y - view.y) * k + pan.y },
    photo,
    box,
  );
}

/** Во сколько раз фото сейчас крупнее, чем «целиком в окне». */
export function zoomOf(view: WallView, photo: Size, box: Size): number {
  return view.scale / fitView(photo, box).scale;
}
