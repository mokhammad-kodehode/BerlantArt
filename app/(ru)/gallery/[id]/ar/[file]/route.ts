import type { NextRequest } from "next/server";

import { buildArFile, cameraTarget } from "@/lib/ar";
import { arFiles, arFileUrl, isArFile } from "@/lib/ar-links";
import { getArtworkById } from "@/lib/artworks";
import { parseRoomOptions } from "@/lib/room-options";

/**
 * Файл модели для камеры телефона: `model.usdz` для iPhone, `model.glb`
 * для Android (AR-3, TICKETS-ar.md).
 *
 * Адрес с верной версией отдаётся с кэшем на год: одинаковый адрес — всегда
 * одинаковый файл, и сборку делает только первый запрос, остальные берёт
 * CDN. Адрес без версии, со старой версией или с лишними параметрами
 * перенаправляется на правильный: так у одной модели один адрес в кэше,
 * а старая ссылка после смены фото ведёт на новую модель.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/gallery/[id]/ar/[file]">) {
  const { id, file } = await ctx.params;
  if (!isArFile(file)) return notFound();

  const work = await getArtworkById(id);
  const target = work === null ? null : cameraTarget(work);
  if (target === null) return notFound();

  const { searchParams } = request.nextUrl;
  // Мусор в раме или покрытии откатывается к умолчанию, как в примерочной.
  const options = parseRoomOptions(Object.fromEntries(searchParams));
  const canonical = arFileUrl(id, file, target.version, options);

  if (`${request.nextUrl.pathname}${request.nextUrl.search}` !== canonical) {
    return new Response(null, {
      status: 307,
      headers: { Location: canonical, "Cache-Control": "no-store" },
    });
  }

  const body = await buildArFile({ target, file, options });

  return new Response(body, {
    headers: {
      "Content-Type": arFiles[file],
      "Content-Length": String(body.length),
      // s-maxage — для CDN Vercel: без него он ответ функции не хранит,
      // и каждый заход собирал бы модель заново.
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
