import { GalleryPage, galleryMetadata } from "@/components/pages/GalleryPage";

export const metadata = galleryMetadata("ru");

/**
 * Вся галерея готовится заранее и обновляется после правки в админке
 * (lib/revalidate.ts) — как страницы работ. Раз в сутки — подстраховка.
 * У категорий и поиска свои адреса (тикет О-11, lib/gallery-routes.ts).
 * До этого всё было одним адресом с параметрами, и страница собиралась
 * на каждый заход: 760 КБ, два запроса в базу и 0,7–1 с ответа.
 */
export const revalidate = 86400;

export default function Page() {
  return <GalleryPage lang="ru" query={{}} />;
}
