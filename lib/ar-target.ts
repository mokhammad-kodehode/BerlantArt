import { createHash } from "node:crypto";

import { canvasPlacement, type CanvasPlacement } from "@/lib/ar-model";
import type { ArtworkWithImages } from "@/lib/artworks";
import { parseCanvasSides, type CanvasSides } from "@/lib/room-options";

/**
 * Можно ли показать работу в камере телефона и какая у её модели версия
 * (AR-3, TICKETS-ar.md). Отдельно от lib/ar.ts, где модель собирается:
 * этим пользуется и лента работ (lib/artworks.ts, у каждой картины —
 * версия модели или null), а lib/ar.ts сам берёт из lib/artworks.ts адрес
 * фото — импорт по кругу.
 */

/** Из чего читается камера: размер холста и главное фото с его размером. */
type ArSource = Pick<ArtworkWithImages, "dimensions"> & {
  images: readonly { url: string; width: number | null; height: number | null }[];
};

/**
 * Ревизия сборки моделей. Поднять, если меняется то, что попадает в файл
 * (сечения рам, материалы, перекодирование фото): иначе телефоны ещё год
 * будут получать старую модель из кэша.
 *
 * 2 — картина для iPhone повёрнута лицом из стены (была полкой, лицом в пол).
 */
const modelRevision = 2;

/**
 * Выключатель примерки через камеру. 3 октября 2026 её ставили на паузу
 * (на iPhone без LiDAR стену ищут до минуты, картина не прижата к стене)
 * и в тот же день вернули по просьбе заказчика. Что доработать —
 * TICKETS-ar.md, раздел «Пауза». `false` снова скрывает все кнопки.
 */
const isCameraOn = true;

/** Что нужно для модели работы, если её можно показать в камере. */
export type ArTarget = {
  canvas: CanvasPlacement;
  /** Главное фото, как оно лежит в базе. */
  photo: string;
  version: string;
};

/**
 * То же, что `arTarget`, но с учётом паузы: им пользуются лента работ
 * и отдача моделей. Пока камера выключена — `null` у всех работ, и значка
 * примерки на табличках нет.
 */
export function cameraTarget(work: ArSource): ArTarget | null {
  return isCameraOn ? arTarget(work) : null;
}

/**
 * Почему у работы нет примерки — для админки (lib/admin-try-on.ts):
 * художница видит причину у самой работы, а не догадывается по
 * пропавшему значку. Порядок — тот, в котором причину проще устранить.
 */
export type TryOnIssue =
  | { kind: "noSize" }
  | { kind: "badSize"; dimensions: string }
  | { kind: "noPhoto" }
  | { kind: "noPhotoSize" }
  | {
      kind: "shape";
      dimensions: string;
      sides: CanvasSides;
      photo: { width: number; height: number };
    };

type TryOnCheck =
  { issue: TryOnIssue } | { canvas: CanvasPlacement; photo: ArSource["images"][number] };

/**
 * Одна проверка на два ответа: `arTarget` и `tryOnIssue` читают её же,
 * поэтому предупреждение в админке не может разойтись с тем, что видит
 * посетитель.
 */
function checkTryOn(work: ArSource): TryOnCheck {
  const dimensions = work.dimensions?.trim();
  if (!dimensions) return { issue: { kind: "noSize" } };
  const sides = parseCanvasSides(dimensions);
  if (sides === null) return { issue: { kind: "badSize", dimensions } };

  // Выборка кладёт главное фото первым.
  const photo = work.images[0];
  if (photo === undefined) return { issue: { kind: "noPhoto" } };
  if (photo.width === null || photo.height === null) return { issue: { kind: "noPhotoSize" } };

  const size = { width: photo.width, height: photo.height };
  const canvas = canvasPlacement(sides, size);
  if (canvas === null) return { issue: { kind: "shape", dimensions, sides, photo: size } };
  return { canvas, photo };
}

/** Причина, по которой примерки у работы нет; `null` — примерка есть. */
export function tryOnIssue(work: ArSource): TryOnIssue | null {
  const check = checkTryOn(work);
  return "issue" in check ? check.issue : null;
}

/**
 * Можно ли показать работу в камере (решение 6). Нельзя, если: размер
 * холста не читается уверенно, нет фото или его размера, форма фото
 * расходится с размером холста. В каждом из этих случаев человек увидел
 * бы в камере ошибку или картину не того размера.
 *
 * Статус не проверяется: прежде проданную работу в камере не показывали,
 * но с 8 октября 2026 продажи на сайте нет (ARCHITECTURE.md, раздел 7) —
 * статус посетителю не виден, и камеру видят все работы (заказчик,
 * 9.10.2026). Иначе отсутствие кнопки само выдавало бы, что картина продана.
 */
export function arTarget(work: ArSource): ArTarget | null {
  const check = checkTryOn(work);
  if ("issue" in check) return null;
  const { canvas, photo } = check;

  const version = createHash("sha256")
    .update(JSON.stringify([modelRevision, photo.url, photo.width, photo.height, work.dimensions]))
    .digest("hex")
    .slice(0, 12);

  return { canvas, photo: photo.url, version };
}
