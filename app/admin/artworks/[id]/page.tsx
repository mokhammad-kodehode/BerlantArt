import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ArtworkForm, type ArtworkFormInitial } from "@/components/admin/ArtworkForm";
import { ArtworkImages, type AdminImage } from "@/components/admin/ArtworkImages";
import { DeleteArtwork } from "@/components/admin/DeleteArtwork";
import { dimensionsFields } from "@/lib/artwork-form";
import { getArtworkById, imageUrl } from "@/lib/artworks";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Редактирование работы",
  robots: { index: false, follow: false },
};

/**
 * Редактирование работы. Один запрос в базу — работа вместе
 * с изображениями.
 *
 * Название работы в заголовке вкладки не ставится: `metadata` тогда
 * потребовал бы второго запроса за тем же самым, а служебная страница
 * закрыта от индексации, и вкладка «Редактирование работы» админку
 * не путает.
 */
export default async function EditArtworkPage({ params }: PageProps<"/admin/artworks/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const artwork = await getArtworkById(id);

  // Работы нет — честная 404, а не пустая форма: пустая выглядела бы как
  // создание новой и молча завела бы дубль.
  if (artwork === null) notFound();

  const initial: ArtworkFormInitial = {
    id: artwork.id,
    values: {
      title: artwork.title,
      // В базе необязательные поля — null, а в форме пустая строка:
      // null в значении поля делает его неуправляемым и роняет React
      // в предупреждение.
      description: artwork.description ?? "",
      category: artwork.category ?? "",
      technique: artwork.technique ?? "",
      ...dimensionsFields(artwork.dimensions),
      year: artwork.year === null ? "" : String(artwork.year),
      price: artwork.price === null ? "" : String(artwork.price),
      status: artwork.status,
      featured: artwork.featured,
    },
  };

  // Адреса собираются здесь, а не в клиентском компоненте: imageUrl
  // лежит в слое доступа к базе, и его импорт утащил бы в браузер всё,
  // что этот слой за собой тянет.
  const images: AdminImage[] = artwork.images.map((image) => ({
    id: image.id,
    alt: image.alt,
    isPrimary: image.isPrimary,
    src: imageUrl(image.url),
  }));

  return (
    <AdminShell
      title={artwork.title}
      back={{ href: "/admin", label: "В панель управления" }}
      actions={
        <Link
          href={`/gallery/${artwork.id}`}
          className="text-ink/55 hover:text-accent text-sm"
          target="_blank"
        >
          Посмотреть на сайте ↗
        </Link>
      }
    >
      <div className="max-w-[760px]">
        <ArtworkForm initial={initial} />

        <ArtworkImages artworkId={artwork.id} artworkTitle={artwork.title} images={images} />

        {/* Удаление стоит в самом низу и отделено чертой: рядом с
            «Сохранить» его однажды нажали бы по инерции. В строке списка
            работ его нет вовсе — там соседняя кнопка меняет статус,
            и промах в необратимом действии стоит слишком дорого. */}
        <div className="border-divider mt-14 border-t pt-6">
          <p className="text-ink/55 mb-3 text-sm">
            Убрать работу с сайта насовсем, вместе с фотографиями.
          </p>
          <DeleteArtwork
            artworkId={artwork.id}
            title={artwork.title}
            photoCount={artwork.images.length}
          />
        </div>
      </div>
    </AdminShell>
  );
}
