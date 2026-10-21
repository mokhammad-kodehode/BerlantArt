import type { Metadata } from "next";

import { ArtworkPage, artworkMetadata } from "@/components/pages/ArtworkPage";
import { getArtworks } from "@/lib/artworks";

/**
 * Страница готовится заранее и обновляется после правки в админке
 * (lib/revalidate.ts). Раз в сутки — только подстраховка. Было 300 секунд:
 * каждая из ~400 страниц работ, открытая посетителем или Google,
 * пересобиралась каждые пять минут — это записи в кеш Vercel, на
 * бесплатном тарифе ограниченные (21.10.2026: 367 тысяч за месяц).
 */
export const revalidate = 86400;

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

export async function generateMetadata({ params }: PageProps<"/gallery/[id]">): Promise<Metadata> {
  const { id } = await params;
  return artworkMetadata("ru", id);
}

export default async function Page({ params }: PageProps<"/gallery/[id]">) {
  const { id } = await params;
  return <ArtworkPage lang="ru" id={id} />;
}
