import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkRoom } from "@/components/gallery/ArtworkRoom";
import { getArtworkById, getArtworks, primaryImageUrl } from "@/lib/artworks";

/** Как у страницы работы: готовится заранее, обновляется раз в пять минут. */
export const revalidate = 300;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const works = await getArtworks();
  return works.map((work) => ({ id: work.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/gallery/[id]/room">): Promise<Metadata> {
  const { id } = await params;
  const work = await getArtworkById(id);
  if (!work) return { title: "Работа не найдена" };

  return {
    title: `«${work.title}» в интерьере`,
    // Та же картина, что на странице работы, только в другой подаче.
    // В поиске ей появляться незачем — там должна быть сама страница работы.
    robots: { index: false, follow: true },
  };
}

/**
 * Работа в тёмной комнате под лампой — по просьбе заказчика: посмотреть,
 * как картина будет висеть на стене. Устройство — в
 * components/gallery/ArtworkRoom.tsx, свет и рама — в globals.css.
 *
 * Шапки сайта здесь нет, как и в полноэкранном просмотре: комната — это
 * весь экран, а шапка поверх темноты разрушила бы впечатление. Путь назад —
 * ссылкой «К работе» в углу.
 */
export default async function ArtworkRoomPage({ params }: PageProps<"/gallery/[id]/room">) {
  const { id } = await params;
  const work = await getArtworkById(id);
  if (!work) notFound();

  // Без фотографии вешать на стену нечего: комната из одной рамы
  // выглядела бы поломкой.
  const src = primaryImageUrl(work);
  if (src === undefined) notFound();

  const details = [work.technique, work.dimensions, work.year].filter(Boolean).join(" · ");

  return (
    <main>
      <ArtworkRoom
        src={src}
        title={work.title}
        details={details || undefined}
        backHref={`/gallery/${work.id}`}
      />
    </main>
  );
}
