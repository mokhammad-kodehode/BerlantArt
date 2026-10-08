import { contactName, type ContactId } from "@/lib/contact-names";
import { clientEnv } from "@/lib/env";
import type { Dictionary } from "@/lib/i18n";
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
  id: ContactId;
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

/**
 * Способ связи без подписей: вид, адрес, ссылка. Такой список можно
 * передать в клиентский компонент — меню в шапке подставит подписи из
 * своего словаря (lib/contact-names.ts) на языке страницы.
 */
export type ContactLink = Pick<Contact, "id" | "value" | "href" | "isExternal">;

/** Все настроенные способы связи — в порядке, в котором их показываем. */
export function contactLinks(): ContactLink[] {
  const links: ContactLink[] = [];

  if (whatsappPhone !== undefined) {
    links.push({
      id: "whatsapp",
      value: formatPhone(whatsappPhone),
      href: whatsappLink(whatsappPhone),
      isExternal: true,
    });

    // Телефон — тот же номер, что WhatsApp: так решил заказчик 2026-09-26.
    // Отдельной переменной нет, чтобы номера не разошлись при смене.
    links.push({
      id: "phone",
      value: formatPhone(whatsappPhone),
      href: `tel:+${whatsappPhone}`,
      isExternal: false,
    });
  }

  if (clientEnv.NEXT_PUBLIC_TELEGRAM !== undefined) {
    links.push({
      id: "telegram",
      value: `@${clientEnv.NEXT_PUBLIC_TELEGRAM}`,
      href: `https://t.me/${clientEnv.NEXT_PUBLIC_TELEGRAM}`,
      isExternal: true,
    });
  }

  links.push({
    id: "instagram",
    value: `@${site.instagram.handle}`,
    href: site.instagram.url,
    isExternal: true,
  });

  if (clientEnv.NEXT_PUBLIC_FACEBOOK !== undefined) {
    links.push({
      id: "facebook",
      value: clientEnv.NEXT_PUBLIC_FACEBOOK,
      href: `https://www.facebook.com/${clientEnv.NEXT_PUBLIC_FACEBOOK}`,
      isExternal: true,
    });
  }

  if (contactEmail !== undefined) {
    links.push({
      id: "email",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
      isExternal: false,
    });
  }

  return links;
}

/** Глагол на кнопке для каждого способа связи. */
function contactAction(id: ContactId, t: Dictionary["contacts"]): string {
  switch (id) {
    case "phone":
      return t.call;
    case "email":
      return t.writeEmail;
    case "instagram":
      return t.seeWorks;
    case "facebook":
      return t.openPage;
    case "whatsapp":
    case "telegram":
      return t.write;
  }
}

/** Настроенные способы связи с подписями на языке страницы. */
export function contactList(t: Dictionary["contacts"]): Contact[] {
  return contactLinks().map((link) => ({
    ...link,
    label: contactName(link.id, t),
    action: contactAction(link.id, t),
  }));
}
