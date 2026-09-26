import { clientEnv } from "@/lib/env";
import { site } from "@/lib/site";

/**
 * Способы связи, которые действительно настроены.
 *
 * Собирается из переменных окружения: незаполненный контакт просто
 * не попадает в список, и страница показывает то, что есть. Это прямое
 * следствие правила «не выдумывать» (.ai/rules/content.md) — выдуманная
 * почта на странице контактов хуже её отсутствия: человек напишет
 * в пустоту и решит, что художница не отвечает.
 *
 * Instagram здесь всегда: это контакт, подтверждённый художницей, и он
 * задан прямо в lib/site.ts, а не в окружении.
 */
export type Contact = {
  /** Для ключа в разметке и для выбора значка. */
  id: "whatsapp" | "phone" | "telegram" | "facebook" | "email" | "instagram";
  /** Как называется способ связи: «WhatsApp», «Почта». */
  label: string;
  /** Что видит человек: номер, адрес, имя. */
  value: string;
  href: string;
  /** Глагол на кнопке: «Написать», «Позвонить». */
  action: string;
  /** Открывается ли в новой вкладке. Звонок и почту уводят в приложение, вкладка им не нужна. */
  isExternal: boolean;
};

/** Номер для ссылки wa.me — он же признак того, что WhatsApp настроен. */
export const whatsappPhone = clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE;

/** Почта художницы, если задана. */
export const contactEmail = clientEnv.NEXT_PUBLIC_CONTACT_EMAIL;

/**
 * Красивый вид номера: 79991234567 → +7 999 123-45-67.
 *
 * Показывать телефон цифрами подряд нельзя — его не прочитать глазами
 * и не продиктовать. В ссылку при этом уходит исходный номер: wa.me
 * с пробелами открывает пустую переписку.
 */
export function formatPhone(phone: string): string {
  const match = /^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  if (match === null) return `+${phone}`;

  const [, country, code, first, second, third] = match;
  return `+${country} ${code} ${first}-${second}-${third}`;
}

/** Ссылка на переписку в WhatsApp с готовым текстом. */
export function whatsappLink(phone: string, message?: string): string {
  const text = message === undefined ? "" : `?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${phone}${text}`;
}

/** Все настроенные способы связи — в порядке, в котором их показываем. */
export function contactList(): Contact[] {
  const contacts: Contact[] = [];

  if (whatsappPhone !== undefined) {
    contacts.push({
      id: "whatsapp",
      label: "WhatsApp",
      value: formatPhone(whatsappPhone),
      href: whatsappLink(whatsappPhone),
      action: "Написать",
      isExternal: true,
    });

    // Телефон — тот же номер, что WhatsApp: так решил заказчик 2026-09-26.
    // Отдельной переменной нет, чтобы номера не разошлись при смене.
    contacts.push({
      id: "phone",
      label: "Телефон",
      value: formatPhone(whatsappPhone),
      href: `tel:+${whatsappPhone}`,
      action: "Позвонить",
      isExternal: false,
    });
  }

  if (clientEnv.NEXT_PUBLIC_TELEGRAM !== undefined) {
    contacts.push({
      id: "telegram",
      label: "Telegram",
      value: `@${clientEnv.NEXT_PUBLIC_TELEGRAM}`,
      href: `https://t.me/${clientEnv.NEXT_PUBLIC_TELEGRAM}`,
      action: "Написать",
      isExternal: true,
    });
  }

  contacts.push({
    id: "instagram",
    label: "Instagram",
    value: `@${site.instagram.handle}`,
    href: site.instagram.url,
    action: "Смотреть работы",
    isExternal: true,
  });

  if (clientEnv.NEXT_PUBLIC_FACEBOOK !== undefined) {
    contacts.push({
      id: "facebook",
      label: "Facebook",
      value: clientEnv.NEXT_PUBLIC_FACEBOOK,
      href: `https://www.facebook.com/${clientEnv.NEXT_PUBLIC_FACEBOOK}`,
      action: "Открыть страницу",
      isExternal: true,
    });
  }

  if (contactEmail !== undefined) {
    contacts.push({
      id: "email",
      label: "Почта",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
      action: "Написать письмо",
      isExternal: false,
    });
  }

  return contacts;
}
