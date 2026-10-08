import type { ArtworkStatus } from "@/lib/generated/prisma/enums";
import { getDictionary, type Locale } from "@/lib/i18n";

/**
 * Главная кнопка под картиной: что на ней написано и с каким текстом
 * откроется WhatsApp (решение заказчика 3 октября 2026).
 *
 * Цена стоит отдельной строкой над кнопкой, а на кнопке — действие, а не
 * цифра: кнопку пробегают глазами, и она должна сразу говорить, что будет
 * после нажатия. Кнопка-ценник «5 000 ₽» на это не отвечает и похожа на
 * метку, а не на кнопку.
 *
 * Текст — на языке страницы: в английской версии иностранец пишет
 * по-английски (решение заказчика от 4 октября 2026).
 */
export type PurchaseAction = {
  label: string;
  /** Готовое сообщение художнице — с ценой и ссылкой, чтобы не переспрашивать. */
  message: string;
};

export function purchaseAction({
  title,
  price,
  status,
  pageUrl,
  lang = "ru",
}: {
  title: string;
  /** Цена для показа (`formatPrice`) или `null`, если не указана. */
  price: string | null;
  status: ArtworkStatus;
  pageUrl: string;
  lang?: Locale;
}): PurchaseAction {
  const t = getDictionary(lang).purchase;

  // Проданную купить нельзя, а пишет ли художница на заказ — не решено.
  // Поэтому кнопка остаётся нейтральной, как была до 3 октября.
  if (status === "SOLD") {
    return {
      label: t.soldLabel,
      message: t.soldMessage(title, pageUrl),
    };
  }

  if (status === "RESERVED") {
    return {
      label: t.reservedLabel,
      message: t.reservedMessage(title, pageUrl),
    };
  }

  if (price === null) {
    return {
      label: t.noPriceLabel,
      message: t.noPriceMessage(title, pageUrl),
    };
  }

  return {
    label: t.buyLabel,
    message: t.buyMessage(title, price, pageUrl),
  };
}
