import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/LoginForm";
import { Container } from "@/components/ui/Container";

/**
 * Вход в админку.
 *
 * Закрыта от индексации, как и `/styleguide` (.ai/rules/security.md):
 * страница входа в поиске — приглашение к перебору паролей.
 */
export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center py-16">
      <Container>
        <div className="mx-auto w-full max-w-[380px]">
          <h1 className="mb-2 text-3xl">Вход</h1>
          <p className="text-ink/75 mb-8 text-sm">Управление работами на сайте.</p>

          <LoginForm />
        </div>
      </Container>
    </main>
  );
}
