import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";

/**
 * Обёртка страниц админки: заголовок, хлебная крошка назад, место под
 * действия справа.
 *
 * Серверный компонент — состояния здесь нет. Заведён сразу, а не «когда
 * появится третья страница»: страниц админки по плану пять, и все они
 * выглядят одинаково сверху. Это тот случай, когда двух потребителей
 * достаточно (.ai/rules/architecture.md).
 */
export function AdminShell({
  title,
  back,
  actions,
  children,
}: {
  title: string;
  /** Куда ведёт ссылка «назад» и как она подписана. */
  back?: { href: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
}) {
  // py-6, а не py-12: пустое поле сверху занимало на телефоне полэкрана,
  // и список работ начинался за сгибом. На витрине воздух уместен,
  // в рабочем окне — нет.
  return (
    <main className="py-6">
      <Container>
        {back !== undefined && (
          <Link
            href={back.href}
            className="text-ink/75 hover:text-accent mb-4 inline-block text-sm"
          >
            ← {back.label}
          </Link>
        )}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl">{title}</h1>
          {actions}
        </div>

        {children}
      </Container>
    </main>
  );
}
