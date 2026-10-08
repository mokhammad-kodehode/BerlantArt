import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { ArtworkForm } from "@/components/admin/ArtworkForm";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Новая работа",
  robots: { index: false, follow: false },
};

/**
 * Создание работы. Запросов к базе — ноль: заполнять форму нечем,
 * все поля пустые, кроме техники по умолчанию.
 *
 * Фотографии здесь не загружаются: у работы ещё нет идентификатора,
 * а значит и места, к которому их привязать. После создания страница
 * сама уводит на редактирование, где загрузка и живёт.
 */
export default async function NewArtworkPage() {
  await requireAdmin();

  return (
    <AdminShell title="Новая работа" back={{ href: "/admin", label: "В панель управления" }}>
      <div className="max-w-[760px]">
        <ArtworkForm initial={null} />
      </div>
    </AdminShell>
  );
}
