import { notFound } from "next/navigation";

import { GalleryPage, galleryMetadata } from "@/components/pages/GalleryPage";
import { categoryBySlug, categorySlugs } from "@/lib/gallery-routes";

export const metadata = galleryMetadata("en");

/**
 * Категория галереи, готова заранее: `/en/gallery/category/flowers`
 * (тикет О-11, lib/gallery-routes.ts). Старые ссылки вида
 * `/en/gallery?category=Цветы` сервер перенаправляет сюда.
 */
export const revalidate = 86400;

/**
 * Только категории из утверждённого списка. Другой адрес — 404 без
 * отрисовки: иначе любой придуманный адрес собирался бы и ложился в кеш
 * Vercel, а записи в кеш на бесплатном тарифе ограничены.
 */
export const dynamicParams = false;

export function generateStaticParams(): { category: string }[] {
  return Object.values(categorySlugs).map((category) => ({ category }));
}

export default async function Page({ params }: PageProps<"/en/gallery/category/[category]">) {
  const category = categoryBySlug((await params).category);
  if (category === undefined) notFound();

  return <GalleryPage lang="en" query={{ category }} />;
}
