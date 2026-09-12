import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";

/**
 * Первый экран админки.
 *
 * Пока это не дашборд, а перекрёсток: счётчики по статусам и список
 * последних работ — Э6-5, они зависят от таблицы работ, которой ещё нет.
 * Здесь ровно то, без чего нельзя пользоваться готовыми страницами:
 * ссылка на создание работы и выход.
 */
export const metadata: Metadata = {
  title: "Панель управления",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Второй рубеж: proxy.ts уже отсеял чужих, но полагаться на него одного
  // нельзя — так прямо сказано в документации Next.
  await requireAdmin();

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
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin/artworks/new" variant="primary">
          Добавить работу
        </ButtonLink>
        <ButtonLink href="/gallery">Открыть галерею</ButtonLink>
      </div>

      {/* Названо явно, чтобы при проверке было видно: это следующий шаг,
          а не забытое место. */}
      <div className="panel-dashed mt-10 p-6 text-sm">
        <p className="mb-1 font-medium">Список работ — следующий шаг</p>
        <p className="text-ink/55">
          Таблица со всеми работами, поиском и быстрой сменой статуса появится здесь. Пока
          существующую работу можно открыть на редактирование из галереи.
        </p>
      </div>
    </AdminShell>
  );
}
