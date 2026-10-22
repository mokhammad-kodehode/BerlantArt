import { GalleryPage, galleryMetadata } from "@/components/pages/GalleryPage";
import { parseGalleryQuery } from "@/lib/gallery-search";

export const metadata = galleryMetadata("ru");

/**
 * Поиск по галерее: `/gallery/search?q=роза&category=flowers`. Живой запрос
 * на каждый заход — вариантов запроса бесконечно много, заранее их не
 * подготовить (тикет О-11, lib/gallery-routes.ts). Старые ссылки вида
 * `/gallery?q=…` сервер перенаправляет сюда.
 */
export default async function Page({ searchParams }: PageProps<"/gallery/search">) {
  return <GalleryPage lang="ru" query={parseGalleryQuery(await searchParams)} />;
}
