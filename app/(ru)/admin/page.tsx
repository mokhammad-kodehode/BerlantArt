import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { BirthdayCard } from "@/components/admin/BirthdayCard";
import { OpenGalleryLink } from "@/components/admin/OpenGalleryLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import { logout } from "@/lib/actions/auth";
import { birthdayCardYear, greeting } from "@/lib/admin-cheer";
import { adminArtworksHref } from "@/lib/admin-filters";
import { artworkStatusNames, artworkStatuses } from "@/lib/artwork-form";
import { getAdminSummary, getFeatured, primaryImageUrl, type ArtworkStatus } from "@/lib/artworks";
import { requireAdmin } from "@/lib/auth";
import { site } from "@/lib/site";

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
/**
 * Картина для открытки: случайная из тех, что художница выбрала для
 * главной, — значит, их она и сама считает лучшими. Запрос уходит только
 * в те дни, когда открытка ждёт, в остальные — ни одного лишнего.
 */
async function pickBirthdayPainting(): Promise<{ src: string; title: string } | undefined> {
  const works = await getFeatured(12);
  const withPhoto = works.flatMap((work) => {
    const src = primaryImageUrl(work);
    return src === undefined ? [] : [{ src, title: work.title }];
  });

  return withPhoto[Math.floor(Math.random() * withPhoto.length)];
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // Второй рубеж: proxy.ts уже отсеял чужих, но полагаться на него одного
  // нельзя — так прямо сказано в документации Next.
  await requireAdmin();

  const now = new Date();
  // `/admin?card` — посмотреть открытку в любой день, не дожидаясь марта.
  const isCardPreview = (await searchParams).card !== undefined;
  const cardYear = birthdayCardYear(now) ?? (isCardPreview ? now.getFullYear() : null);

  const [{ counts, total, recent }, painting] = await Promise.all([
    getAdminSummary(),
    cardYear === null ? undefined : pickBirthdayPainting(),
  ]);

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
      // Приветствие вместо «Панели управления» — подарок художнице
      // (lib/admin-cheer.ts). Время считается при каждом входе: страница
      // за паролем и в кеш не попадает.
      title={`${greeting(now)}, Берлант!`}
      lead={site.slogan}
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
              <span className="text-ink-soft text-sm">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mb-12 flex flex-wrap gap-3">
        <ButtonLink href="/admin/artworks/new" variant="primary">
          Добавить работу
        </ButtonLink>
        <ButtonLink href="/admin/artworks">Все работы</ButtonLink>
        <OpenGalleryLink />
        {cardYear !== null && (
          <BirthdayCard year={cardYear} isPreview={isCardPreview} painting={painting} />
        )}
      </div>

      <h2 className="mb-4 text-2xl">Добавлены последними</h2>

      {recent.length === 0 ? (
        <div className="panel-dashed text-ink-soft p-6 text-sm">
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
                      <span className="text-ink-soft flex h-full items-center justify-center text-sm">
                        нет фото
                      </span>
                    ) : (
                      <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium">{work.title}</span>
                    <span className="text-ink-soft text-sm">
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
