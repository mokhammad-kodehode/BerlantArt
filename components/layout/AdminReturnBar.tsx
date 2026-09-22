"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { forgetAdminReturn, readAdminReturn, subscribeAdminReturn } from "@/lib/admin-return";

/**
 * Возврат в панель управления с публичных страниц.
 *
 * Появляется, только если на сайт вышли из админки кнопкой «Открыть
 * галерею» (см. lib/admin-return.ts). Посетитель её не видит никогда:
 * пометка ставится нажатием в закрытой части сайта.
 *
 * Состояние читается через useSyncExternalStore, а не через useState
 * с эффектом: на сервере хранилища нет, и этот хук честно возвращает для
 * сервера null, а в браузере подписывается на изменения. Так разметка
 * сервера и первая отрисовка совпадают без обходных путей.
 *
 * Полоса прижата к низу слева и не липнет к содержимому: на странице
 * работы правый нижний угол занят стрелками листания.
 */
export function AdminReturnBar() {
  const pathname = usePathname();
  const flag = useSyncExternalStore(subscribeAdminReturn, readAdminReturn, () => null);

  // В самой админке полоса не нужна: там есть своя навигация.
  if (flag === null || pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30 flex items-center gap-1 rounded-full border border-neutral-100/20 bg-neutral-900/85 p-1 pl-3 text-neutral-100 shadow-lg backdrop-blur-sm">
      <Link
        href="/admin"
        onClick={forgetAdminReturn}
        className="text-sm text-neutral-100 no-underline"
      >
        ← В панель управления
      </Link>

      {/* Полосу можно убрать, не уходя со страницы: художница может
          захотеть посмотреть сайт без служебных надписей. */}
      <button
        type="button"
        onClick={forgetAdminReturn}
        aria-label="Скрыть возврат в панель управления"
        title="Скрыть"
        className="flex size-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-neutral-100/70 hover:text-neutral-100"
      >
        ×
      </button>
    </div>
  );
}
