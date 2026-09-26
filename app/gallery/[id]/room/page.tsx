import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkRoom, type RoomThumb } from "@/components/gallery/ArtworkRoom";
import { getArtworkById, getArtworks, primaryImageUrl } from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { parseCanvasSides, parseRoomOptions } from "@/lib/room-options";

export async function generateMetadata({
  params,
}: PageProps<"/gallery/[id]/room">): Promise<Metadata> {
  const { id } = await params;
  const work = await getArtworkById(id);
  if (!work) return { title: "Работа не найдена" };

  return {
    title: `Примерочная: «${work.title}»`,
    // Та же картина, что на странице работы, только в другой подаче.
    // В поиске ей появляться незачем — там должна быть сама страница работы.
    robots: { index: false, follow: true },
  };
}

/**
 * Примерочная — по просьбе заказчика: посмотреть картину на стене, выбрать
 * раму, цвет стены и свет, сменить картину, не выходя из комнаты.
 * Устройство — в components/gallery/ArtworkRoom.tsx, варианты выбора
 * и разбор адреса — в lib/room-options.ts.
 *
 * Страница читает параметры адреса, поэтому готовится при каждом заходе,
 * а не заранее — как галерея с фильтрами. Запросов в базу два, разом:
 * сама работа и список работ для полосы «другая картина».
 *
 * Шапки сайта здесь нет, как в полноэкранном просмотре: комната — это
 * весь экран. Путь назад — «К работе» в углу.
 */
export default async function ArtworkRoomPage({
  params,
  searchParams,
}: PageProps<"/gallery/[id]/room">) {
  const { id } = await params;
  const [work, all, rawOptions] = await Promise.all([
    getArtworkById(id),
    getArtworks(),
    searchParams,
  ]);
  if (!work) notFound();

  // Без фотографии вешать на стену нечего: комната из одной рамы
  // выглядела бы поломкой.
  const src = primaryImageUrl(work);
  if (src === undefined) notFound();

  const works: RoomThumb[] = all.flatMap((item) => {
    const thumb = primaryImageUrl(item);
    return thumb === undefined ? [] : [{ id: item.id, title: item.title, src: thumb }];
  });

  const details = [work.technique, work.dimensions, work.year].filter(Boolean).join(" · ");

  return (
    <main>
      <ArtworkRoom
        work={{
          id: work.id,
          title: work.title,
          src,
          details: details || undefined,
          sides: parseCanvasSides(work.dimensions),
        }}
        works={works}
        initialOptions={parseRoomOptions(rawOptions)}
        whatsappPhone={clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE}
        siteUrl={clientEnv.NEXT_PUBLIC_SITE_URL}
      />
    </main>
  );
}
