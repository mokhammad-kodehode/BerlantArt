"use client";

import { ButtonLink } from "@/components/ui/Button";
import { rememberAdminReturn } from "@/lib/admin-return";

/**
 * «Открыть галерею» из панели управления.
 *
 * Отличается от обычной ссылки одним: помечает, что на публичный сайт
 * вышли из админки. По этой пометке на страницах сайта появляется полоса
 * «← В панель управления» (components/layout/AdminReturnBar.tsx) —
 * иначе обратной дороги нет, кроме адресной строки.
 */
export function OpenGalleryLink() {
  return (
    <ButtonLink href="/gallery" onClick={rememberAdminReturn}>
      Открыть галерею
    </ButtonLink>
  );
}
