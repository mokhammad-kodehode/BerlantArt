import { GalleryPage, galleryMetadata } from "@/components/pages/GalleryPage";
import { parseGalleryQuery } from "@/lib/gallery-search";

export const metadata = galleryMetadata("en");

/**
 * Поиск по галерее: `/en/gallery/search?q=роза&category=flowers`. Живой запрос
 * на каждый заход — вариантов запроса бесконечно много, заранее их не
 * подготовить (тикет О-11, lib/gallery-routes.ts). Старые ссылки вида
 * `/en/gallery?q=…` сервер перенаправляет сюда.
 */
export default async function Page({ searchParams }: PageProps<"/en/gallery/search">) {
  return <GalleryPage lang="en" query={parseGalleryQuery(await searchParams)} />;
}
