import { defaultRoomOptions, roomQuery, type RoomOptions } from "@/lib/room-options";

/**
 * Адреса примерки через камеру (AR-3, AR-4, TICKETS-ar.md). Отдельно от
 * lib/ar.ts, потому что нужны и кнопке в браузере, а lib/ar.ts собирает
 * модели и тянет за собой sharp и node:crypto — в браузер им нельзя.
 */

/** Форматы: USDZ — для iPhone (AR Quick Look), GLB — для Android (Scene Viewer). */
export const arFiles = {
  "model.usdz": "model/vnd.usdz+zip",
  "model.glb": "model/gltf-binary",
} as const;

export type ArFile = keyof typeof arFiles;

export function isArFile(name: string): name is ArFile {
  return Object.hasOwn(arFiles, name);
}

/** Выбор, от которого зависит модель: только рама. Стена и свет в камере — настоящие. */
export type ArOptions = Pick<RoomOptions, "frame" | "finish">;

/**
 * Адрес модели. Выбор рамы пишется всегда и в одном порядке: одинаковая
 * модель — один адрес, и CDN не хранит её копии под разными.
 */
export function arFileUrl(
  workId: string,
  file: ArFile,
  version: string,
  options: ArOptions,
): string {
  const query = new URLSearchParams({ v: version, frame: options.frame, finish: options.finish });
  return `/gallery/${workId}/ar/${file}?${query}`;
}

/** Страница примерки через камеру с той же рамой. Умолчания в адрес не пишутся, как в примерочной. */
export function arPageUrl(workId: string, options: ArOptions): string {
  return `/gallery/${workId}/ar${roomQuery({ ...defaultRoomOptions, ...options })}`;
}

/** Примерочная без камеры с той же рамой. */
export function roomPageUrl(workId: string, options: ArOptions): string {
  return `/gallery/${workId}/room${roomQuery({ ...defaultRoomOptions, ...options })}`;
}

/** Метка в адресе, с которой Android возвращает на страницу, если Scene Viewer недоступен. */
export const noCameraHash = "#no-ar";

/**
 * Адрес для Scene Viewer на Android. `ar_only` — сразу камера, без
 * 3D-просмотра; для него Google велит пакет ARCore. `resizable=false` —
 * масштаб менять нельзя: картина в настоящем размере, в этом весь смысл.
 * `enable_vertical_placement` — вешать на стену, а не ставить на пол.
 * Нет ARCore — браузер откроет `fallbackUrl`.
 */
export function sceneViewerUrl({
  glbUrl,
  title,
  fallbackUrl,
}: {
  glbUrl: string;
  title: string;
  fallbackUrl: string;
}): string {
  const query = new URLSearchParams({
    file: glbUrl,
    mode: "ar_only",
    resizable: "false",
    enable_vertical_placement: "true",
    title,
  });
  const intent = [
    "Intent",
    "scheme=https",
    "package=com.google.ar.core",
    "action=android.intent.action.VIEW",
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    "end;",
  ].join(";");
  return `intent://arvr.google.com/scene-viewer/1.0?${query}#${intent}`;
}

/**
 * Адрес для AR Quick Look на iPhone. `allowsContentScaling=0` запрещает
 * менять масштаб щипком — по той же причине, что `resizable=false`.
 */
export function quickLookUrl(usdzUrl: string): string {
  return `${usdzUrl}#allowsContentScaling=0`;
}
