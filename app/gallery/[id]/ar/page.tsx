import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ArtworkRoom } from "@/components/gallery/ArtworkRoom";
import { arTarget } from "@/lib/ar";
import { roomPageUrl } from "@/lib/ar-links";
import { getArtworkById, primaryImageUrl } from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { parseCanvasSides, parseRoomOptions } from "@/lib/room-options";

export async function generateMetadata({
  params,
}: PageProps<"/gallery/[id]/ar">): Promise<Metadata> {
  const { id } = await params;
  const work = await getArtworkById(id);
  if (!work) return { title: "Работа не найдена" };

  return {
    title: `Через камеру: «${work.title}»`,
    // Как примерочная: в поиске должна быть сама страница работы.
    robots: { index: false, follow: true },
  };
}

/**
 * Примерка через камеру телефона (AR-4, TICKETS-ar.md) — отдельная
 * страница рядом с примерочной, по решению заказчика: вариантов два,
 * с камерой и без. Выбор рамы тот же, что в примерочной, а кнопка
 * «Открыть камеру» передаёт модель просмотрщику телефона.
 *
 * Запрос в базу один — сама работа. Другие картины здесь не предлагаются:
 * в камере показать можно не каждую.
 */
export default async function ArtworkCameraPage({
  params,
  searchParams,
}: PageProps<"/gallery/[id]/ar">) {
  const { id } = await params;
  const [work, rawOptions] = await Promise.all([getArtworkById(id), searchParams]);
  if (!work) notFound();

  const src = primaryImageUrl(work);
  if (src === undefined) notFound();

  const options = parseRoomOptions(rawOptions);

  // Работу продали или сменили ей фото — по старой ссылке человек попадает
  // в обычную примерочную с той же рамой, а не на страницу с мёртвой кнопкой.
  const target = arTarget(work);
  if (target === null) redirect(roomPageUrl(work.id, options));

  const details = [work.technique, work.dimensions, work.year].filter(Boolean).join(" · ");

  return (
    <main>
      <ArtworkRoom
        variant="camera"
        work={{
          id: work.id,
          title: work.title,
          src,
          details: details || undefined,
          sides: parseCanvasSides(work.dimensions),
        }}
        works={[]}
        initialOptions={options}
        arVersion={target.version}
        whatsappPhone={clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE}
        siteUrl={clientEnv.NEXT_PUBLIC_SITE_URL}
      />
    </main>
  );
}
