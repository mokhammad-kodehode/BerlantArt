import {
  frameLooks,
  railLight,
  woodFigure,
  woodGrain,
  type FrameLook,
  type Pattern,
} from "@/lib/frame-look";
import { frameFinish, frameModel, type CanvasCm, type FrameChoice } from "@/lib/room-options";

/**
 * Картина в раме на canvas — для фото своей стены и снимка с него
 * (TICKETS-primerka.md, П-3 и П-4). Повторяет раму с экрана
 * (FramedPainting, globals.css «Рама») по тем же данным из
 * lib/frame-look.ts: профиль, пояса узора, волокно, свет по сторонам.
 *
 * Рисуется в сантиметрах, серединой в начале координат: куда и под каким
 * наклоном её поставить на фото, задаёт преобразование canvas
 * (lib/wall-plane.ts, localAffine). Только для браузера.
 */

/** Чем canvas умеет рисовать и какого оно размера: фото работы. */
export type PaintingImage = { source: CanvasImageSource; width: number; height: number };

/**
 * Узоры в lib/frame-look.ts — в точках экрана и подобраны под планку
 * шириной около 30 точек (экран «Картина и рама», багет на холсте 80 см).
 * Здесь они масштабируются с планкой: бусины на тонкой раме мельче.
 */
const patternRailPx = 30;

/** Цвет щели парящей рамы и подложки — тот же, что в CSS (.framed). */
const gapColor = "#141210";

type Rail = { length: number; thickness: number; light: number };

/** Повторяющийся узор вдоль оси: полосы `pattern`, период — конец последней. */
function stripes(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  scale: number,
  span: number,
  draw: (from: number, size: number) => void,
): void {
  const period = pattern[pattern.length - 1][2] * scale;
  if (period <= 0) return;
  for (let start = 0; start < span; start += period) {
    for (const [color, from, to] of pattern) {
      if (color === "transparent") continue;
      ctx.fillStyle = color;
      draw(start + from * scale, (to - from) * scale);
    }
  }
}

/**
 * Одна планка, как верхняя: длина по x, наружный край — y = 0, холст —
 * y = thickness. Остальные стороны рисуются ею же, повёрнутой.
 */
function drawRail(
  ctx: CanvasRenderingContext2D,
  rail: Rail,
  { look, isWood, profile }: { look: FrameLook; isWood: boolean; profile: CanvasGradient },
): void {
  const { length: l, thickness: t } = rail;
  const scale = t / patternRailPx;

  ctx.save();
  // Трапеция со скосами в углах, как у настоящего багета.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(l, 0);
  ctx.lineTo(l - t, t);
  ctx.lineTo(t, t);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = profile;
  ctx.fillRect(0, 0, l, t);

  // Слои — в обратном порядке CSS: там первый фон лежит сверху.
  if (isWood) {
    stripes(ctx, woodFigure, scale, l, (from, size) => ctx.fillRect(from, 0, size, t));
    stripes(ctx, woodGrain, scale, t, (from, size) => ctx.fillRect(0, from, l, size));
  }
  for (const band of [...look.bands].reverse()) {
    const height = band.size * t;
    const top = (t - height) * band.pos;
    stripes(ctx, band.pattern, scale, l, (from, size) => ctx.fillRect(from, top, size, height));
  }

  // Свет по сторонам — как filter: brightness() у планок в CSS.
  // Темнее — чёрным поверх; светлее — тем же профилем ещё раз, сложением.
  if (rail.light < 1) {
    ctx.fillStyle = `rgb(0 0 0 / ${1 - rail.light})`;
    ctx.fillRect(0, 0, l, t);
  } else if (rail.light > 1) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = rail.light - 1;
    ctx.fillStyle = profile;
    ctx.fillRect(0, 0, l, t);
  }
  ctx.restore();
}

/** Фото в прямоугольник целиком, с обрезкой лишнего по краям — как object-fit: cover. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: PaintingImage,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const target = width / height;
  const own = image.width / image.height;
  const sw = own > target ? image.height * target : image.width;
  const sh = own > target ? image.height : image.width / target;
  ctx.drawImage(
    image.source,
    (image.width - sw) / 2,
    (image.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    width,
    height,
  );
}

/** Сколько картина в раме занимает на стене, сантиметры. */
export function framedSize(canvas: CanvasCm, choice: FrameChoice): CanvasCm {
  const { widthCm, gapCm } = frameModel(choice.frame);
  return {
    width: canvas.width + 2 * (widthCm + gapCm),
    height: canvas.height + 2 * (widthCm + gapCm),
  };
}

/**
 * Картина в раме серединой в (0, 0), в сантиметрах. Тень на стене рисует
 * вызывающий: её размытие задаётся в точках экрана, а не в сантиметрах.
 */
export function drawFramedPainting(
  ctx: CanvasRenderingContext2D,
  { image, canvas, choice }: { image: PaintingImage | null; canvas: CanvasCm; choice: FrameChoice },
): void {
  const t = frameModel(choice.frame).widthCm;
  const outer = framedSize(canvas, choice);
  const left = -outer.width / 2;
  const top = -outer.height / 2;

  // Подложка под рамой: её видно в щели парящей рамы, между планками и холстом.
  ctx.fillStyle = gapColor;
  if (choice.frame !== "none") ctx.fillRect(left, top, outer.width, outer.height);

  const cx = -canvas.width / 2;
  const cy = -canvas.height / 2;
  if (image === null) ctx.fillRect(cx, cy, canvas.width, canvas.height);
  else drawCover(ctx, image, cx, cy, canvas.width, canvas.height);
  if (choice.frame === "none") return;

  // Холст утоплен в раму: верхняя планка отбрасывает на него тень полосой.
  const shade = ctx.createLinearGradient(0, cy, 0, cy + t * 0.6);
  shade.addColorStop(0, "rgb(0 0 0 / 0.5)");
  shade.addColorStop(1, "rgb(0 0 0 / 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx, cy, canvas.width, t * 0.6);
  const sides = ctx.createLinearGradient(cx, 0, cx + canvas.width, 0);
  const edge = Math.min(0.5, (t * 0.3) / canvas.width);
  sides.addColorStop(0, "rgb(0 0 0 / 0.3)");
  sides.addColorStop(edge, "rgb(0 0 0 / 0)");
  sides.addColorStop(1 - edge, "rgb(0 0 0 / 0)");
  sides.addColorStop(1, "rgb(0 0 0 / 0.3)");
  ctx.fillStyle = sides;
  ctx.fillRect(cx, cy, canvas.width, canvas.height);

  // Профиль — от наружного края к холсту, одинаковый у всех сторон.
  const { tones, kind } = frameFinish(choice.finish);
  const look = frameLooks[choice.frame];
  const profile = ctx.createLinearGradient(0, 0, 0, t);
  for (const [tone, at] of look.profile) profile.addColorStop(at, tones[tone]);

  // Каждая сторона — верхняя планка, повёрнутая на место; свет — свой.
  const sidesOf: { at: [number, number]; turn: number; rail: Rail }[] = [
    { at: [left, top], turn: 0, rail: { length: outer.width, thickness: t, light: railLight.top } },
    {
      at: [left + outer.width, top],
      turn: Math.PI / 2,
      rail: { length: outer.height, thickness: t, light: railLight.right },
    },
    {
      at: [left + outer.width, top + outer.height],
      turn: Math.PI,
      rail: { length: outer.width, thickness: t, light: railLight.bottom },
    },
    {
      at: [left, top + outer.height],
      turn: -Math.PI / 2,
      rail: { length: outer.height, thickness: t, light: railLight.left },
    },
  ];
  for (const side of sidesOf) {
    ctx.save();
    ctx.translate(side.at[0], side.at[1]);
    ctx.rotate(side.turn);
    drawRail(ctx, side.rail, { look, isWood: kind === "wood", profile });
    ctx.restore();
  }
}
