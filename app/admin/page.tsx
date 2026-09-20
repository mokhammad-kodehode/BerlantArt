import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { logout } from "@/lib/actions/auth";
import { adminArtworksHref } from "@/lib/admin-filters";
import { artworkStatusNames, artworkStatuses } from "@/lib/artwork-form";
import { getAdminSummary, primaryImageUrl, type ArtworkStatus } from "@/lib/artworks";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Панель управления",
  robots: { index: false, follow: false },
};

/** Подписи счётчиков: во множественном числе, в отличие от селекта статуса. */
const countLabels: Record<ArtworkStatus, string> = {
  AVAILABLE: "Доступны",
  RESERVED: "Забронированы",
  SOLD: "Проданы",
};

/**
 * Первый экран админки: сколько работ в каком статусе и что добавлено
 * последним.
 *
 * Счётчики — ссылки на список работ с тем же фильтром: увидеть число
 * и не иметь возможности открыть эти работы одним нажатием — лишний шаг.
 * Два запроса в базу при любом числе работ.
 */
export default async function AdminPage() {
  // Второй рубеж: proxy.ts уже отсеял чужих, но полагаться на него одного
  // нельзя — так прямо сказано в документации Next.
  await requireAdmin();

  const { counts, total, recent } = await getAdminSummary();

  const tiles = [
    { label: "Всего работ", count: total, href: adminArtworksHref({}) },
    ...artworkStatuses.map((status) => ({
      label: countLabels[status],
      count: counts[status],
      href: adminArtworksHref({}, { status }),
    })),
  ];

  return (
    <AdminShell
      title="Панель управления"
      actions={
        <form action={logout}>
          <Button type="submit" variant="ghost">
            Выйти
          </Button>
        </form>
      }
    >
      <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className="border-divider hover:border-accent rounded-tile block border p-3 sm:p-4"
            >
              <span className="block text-3xl">{tile.count}</span>
              <span className="text-ink/75 text-sm">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mb-12 flex flex-wrap gap-3">
        <ButtonLink href="/admin/artworks/new" variant="primary">
          Добавить работу
        </ButtonLink>
        <ButtonLink href="/admin/artworks">Все работы</ButtonLink>
        <ButtonLink href="/gallery">Открыть галерею</ButtonLink>
      </div>

      <h2 className="mb-4 text-2xl">Добавлены последними</h2>

      {recent.length === 0 ? (
        <div className="panel-dashed text-ink/75 p-6 text-sm">
          Работ пока нет. Первая появится здесь сразу после создания.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {recent.map((work) => {
            const src = primaryImageUrl(work);

            return (
              <li key={work.id}>
                <Link
                  href={`/admin/artworks/${work.id}`}
                  className="border-divider hover:border-accent flex items-center gap-4 rounded-[14px] border p-3"
                >
                  <span className="bg-surface relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                    {src === undefined ? (
                      <span className="text-ink/75 flex h-full items-center justify-center text-[10px]">
                        нет фото
                      </span>
                    ) : (
                      <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium">{work.title}</span>
                    <span className="text-ink/75 text-sm">
                      {[work.category, artworkStatusNames[work.status]].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
