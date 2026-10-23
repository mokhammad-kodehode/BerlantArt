import type { NextRequest } from "next/server";

import { buildArFile, buildWallPhoto } from "@/lib/ar";
import { arTarget, cameraTarget } from "@/lib/ar-target";
import { arFiles, arFileUrl, isArFile, wallPhotoFile, wallPhotoUrl } from "@/lib/ar-links";
import { getArtworkById } from "@/lib/artworks";
import { parseFrameChoice } from "@/lib/room-options";

/**
 * Файл модели для камеры телефона: `model.usdz` для iPhone, `model.glb`
 * для Android (AR-3, TICKETS-ar.md).
 *
 * Адрес с верной версией отдаётся с кэшем на год: одинаковый адрес — всегда
 * одинаковый файл, и сборку делает только первый запрос, остальные берёт
 * CDN. Адрес без версии, со старой версией или с лишними параметрами
 * перенаправляется на правильный: так у одной модели один адрес в кэше,
 * а старая ссылка после смены фото ведёт на новую модель.
 *
 * Здесь же — `photo.jpg`, фото картины для снимка своей стены
 * (TICKETS-primerka.md, П-4): со своего адреса, иначе браузер не отдаст
 * готовый снимок. Оно не зависит от выключателя камеры — фото стены
 * работает и без неё.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/gallery/[id]/ar/[file]">) {
  const { id, file } = await ctx.params;
  const isPhoto = file === wallPhotoFile;
  if (!isPhoto && !isArFile(file)) return notFound();

  const work = await getArtworkById(id);
  const target = work === null ? null : isPhoto ? arTarget(work) : cameraTarget(work);
  if (target === null) return notFound();

  if (isPhoto) {
    return immutable(request, wallPhotoUrl(id, target.version), "image/jpeg", () =>
      buildWallPhoto(target),
    );
  }
  if (!isArFile(file)) return notFound();

  // Мусор в раме или покрытии откатывается к умолчанию, как в примерочной.
  const options = parseFrameChoice(Object.fromEntries(request.nextUrl.searchParams));
  return immutable(request, arFileUrl(id, file, target.version, options), arFiles[file], () =>
    buildArFile({ target, file, options }),
  );
}

/**
 * Ответ по адресу с версией: неверный адрес — на верный, верный — с кэшем
 * на год. s-maxage — для CDN Vercel: без него он ответ функции не хранит,
 * и каждый заход собирал бы файл заново.
 */
async function immutable(
  request: NextRequest,
  canonical: string,
  type: string,
  build: () => Promise<Uint8Array<ArrayBuffer>>,
): Promise<Response> {
  if (`${request.nextUrl.pathname}${request.nextUrl.search}` !== canonical) {
    return new Response(null, {
      status: 307,
      headers: { Location: canonical, "Cache-Control": "no-store" },
    });
  }

  const body = await build();
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}

function notFound(): Response {
  // Короткий кэш: работа может стать доступной через минуту после правки.
  return new Response("Модели для этой работы нет.", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain; charset=utf-8" },
  });
}
