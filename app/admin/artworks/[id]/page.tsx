import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ArtworkForm, type ArtworkFormInitial } from "@/components/admin/ArtworkForm";
import { getArtworkById } from "@/lib/artworks";
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
      dimensions: artwork.dimensions ?? "",
      year: artwork.year === null ? "" : String(artwork.year),
      price: artwork.price === null ? "" : String(artwork.price),
      status: artwork.status,
      featured: artwork.featured,
    },
  };

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

        {/* Загрузка фотографий — Э6-2б. Место под неё названо явно, чтобы
            при проверке было видно: это не забыли, это следующий шаг. */}
        <div className="panel-dashed mt-10 p-6 text-sm">
          <p className="mb-1 font-medium">Фотографии — следующий шаг</p>
          <p className="text-ink/55">
            Сейчас у работы {artwork.images.length === 0 ? "нет фотографий" : null}
            {artwork.images.length > 0 ? `фотографий: ${artwork.images.length}` : null}. Загрузка и
            порядок появятся здесь же.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
