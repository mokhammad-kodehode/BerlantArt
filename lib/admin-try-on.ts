import type { TryOnIssue } from "@/lib/ar-target";
import { normalizeCanvasSize } from "@/lib/room-options";

/**
 * Предупреждение «примерки нет» в админке: коротко — в строке списка
 * работ, полностью — на странице работы (заказчик, 23.10.2026). Значок
 * примерки на сайте просто не появляется, и без подсказки было не понять
 * почему — особенно когда фото чёткое, а дело в его форме.
 */
export type TryOnNotice = { short: string; text: string };

export function tryOnNotice(issue: TryOnIssue): TryOnNotice {
  switch (issue.kind) {
    case "noSize":
      return {
        short: "нет размера",
        text: "Не указан размер холста. Примерка появится, как только он будет в карточке.",
      };
    case "badSize":
      return {
        short: "размер не читается",
        text: `Размер «${issue.dimensions}» не получается прочитать. Запишите его двумя числами, например «60 × 80 см».`,
      };
    case "noPhoto":
      return { short: "нет фото", text: "У работы нет фото." };
    case "noPhotoSize":
      return {
        short: "у фото нет размера",
        text: "У главного фото не записан размер в пикселях. Загрузите фото заново — при загрузке сайт прочитает его сам.",
      };
    case "shape":
      return shapeNotice(issue);
  }
}

/** Квадрат — с запасом в 3%: фото кадрируют по краю холста от руки. */
const squareSlack = 0.03;

/**
 * Форма фото не сходится с холстом. Качество фото тут ни при чём —
 * поэтому называются оба размера и пример фото, которое подойдёт: его
 * длинная сторона остаётся, короткая — по пропорции холста.
 */
function shapeNotice({
  dimensions,
  sides,
  photo,
}: Extract<TryOnIssue, { kind: "shape" }>): TryOnNotice {
  const ratio = photo.width / photo.height;
  const shape =
    Math.abs(ratio - 1) < squareSlack
      ? "квадратное"
      : ratio > 1
        ? "горизонтальное"
        : "вертикальное";

  const long = Math.max(photo.width, photo.height);
  const short = Math.round((long * sides.short) / sides.long);
  // Ориентации в базе нет — её задаёт фото. У квадратного фото она не
  // видна, поэтому пример — в обе стороны.
  const example =
    shape === "квадратное"
      ? `${short} × ${long} пикс. (или ${long} × ${short}, если картина горизонтальная).`
      : ratio > 1
        ? `${long} × ${short} пикс.`
        : `${short} × ${long} пикс.`;

  return {
    short: "фото не по форме холста",
    text:
      `Фото ${photo.width} × ${photo.height} пикс. — ${shape}, а холст — ${normalizeCanvasSize(dimensions)}. ` +
      "Форма не совпадает, и на стене картина вышла бы искажённой. Так бывает, когда фото " +
      "обрезано — например, в Instagram, — или когда вокруг холста попала стена. Загрузите фото, " +
      `где картина целиком и обрезана точно по краю холста: для такого размера — примерно ${example} ` +
      "Или проверьте, верно ли указан размер.",
  };
}
