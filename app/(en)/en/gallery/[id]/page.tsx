import type { Metadata } from "next";

import { ArtworkPage, artworkMetadata } from "@/components/pages/ArtworkPage";
import { getArtworks } from "@/lib/artworks";

/** Как на главной и в галерее: страница готовится заранее, а не при каждом заходе. */
export const revalidate = 300;

/**
 * Адреса всех работ известны на сборке — пять страниц готовятся заранее.
 *
 * `dynamicParams` намеренно оставлен по умолчанию (`true`): работа, которую
 * художница добавит через админку на этапе 6, отрисуется по первому запросу,
 * а не отдаст 404 до следующей сборки.
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const works = await getArtworks();
  return works.map((work) => ({ id: work.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/en/gallery/[id]">): Promise<Metadata> {
  const { id } = await params;
  return artworkMetadata("en", id);
}

export default async function Page({ params }: PageProps<"/en/gallery/[id]">) {
  const { id } = await params;
  return <ArtworkPage lang="en" id={id} />;
}
