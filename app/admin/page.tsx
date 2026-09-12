import type { Metadata } from "next";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";

/**
 * Заглушка дашборда. Настоящий — счётчики по статусам и последние работы —
 * в Э6-5: он зависит от таблицы работ, которой ещё нет. Пока страница нужна
 * затем, чтобы было куда пускать после входа и откуда выходить.
 */
export const metadata: Metadata = {
  title: "Панель управления",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Второй рубеж: proxy.ts уже отсеял чужих, но на него одного полагаться
  // нельзя — так прямо сказано в документации Next.
  await requireAdmin();

  return (
    <main className="py-16">
      <Container>
        <h1 className="font-display mb-4 text-3xl">Панель управления</h1>
        <p className="text-ink/55 mb-8 text-sm">
          Вход работает. Список работ и форма загрузки — следующие тикеты.
        </p>

        <form action={logout}>
          <Button type="submit" variant="secondary">
            Выйти
          </Button>
        </form>
      </Container>
    </main>
  );
}
