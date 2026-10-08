import type { Dictionary } from "@/lib/i18n/ru";

/** Способ связи — для ключа в разметке и выбора значка (ContactIcon). */
export type ContactId = "whatsapp" | "phone" | "telegram" | "facebook" | "email" | "instagram";

/**
 * Как называется способ связи: «WhatsApp», «Почта». Названия сервисов —
 * как есть, телефон и почта — на языке страницы.
 *
 * Отдельным модулем, а не в lib/contacts.ts: тот читает lib/env.ts, где
 * при импорте проверяются и серверные переменные, — в браузере их нет.
 * А название нужно и меню в шапке, которое работает в браузере.
 */
export function contactName(id: ContactId, t: Dictionary["contacts"]): string {
  switch (id) {
    case "phone":
      return t.phone;
    case "email":
      return t.email;
    case "whatsapp":
      return "WhatsApp";
    case "telegram":
      return "Telegram";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
  }
}
