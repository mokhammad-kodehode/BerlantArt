import type { ArtworkStatus } from "@/lib/generated/prisma/enums";

/**
 * Главная кнопка под картиной: что на ней написано и с каким текстом
 * откроется WhatsApp (решение заказчика 3 октября 2026).
 *
 * Цена стоит отдельной строкой над кнопкой, а на кнопке — действие, а не
 * цифра: кнопку пробегают глазами, и она должна сразу говорить, что будет
 * после нажатия. Кнопка-ценник «5 000 ₽» на это не отвечает и похожа на
 * метку, а не на кнопку.
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
}: {
  title: string;
  /** Цена для показа (`formatPrice`) или `null`, если не указана. */
  price: string | null;
  status: ArtworkStatus;
  pageUrl: string;
}): PurchaseAction {
  // Проданную купить нельзя, а пишет ли художница на заказ — не решено.
  // Поэтому кнопка остаётся нейтральной, как была до 3 октября.
  if (status === "SOLD") {
    return {
      label: "Написать в WhatsApp",
      message: `Здравствуйте! Интересует работа «${title}». ${pageUrl}`,
    };
  }

  if (status === "RESERVED") {
    return {
      label: "Спросить о картине",
      message: `Здравствуйте! Работа «${title}» ещё забронирована? ${pageUrl}`,
    };
  }

  if (price === null) {
    return {
      label: "Узнать цену",
      message: `Здравствуйте! Сколько стоит работа «${title}»? ${pageUrl}`,
    };
  }

  return {
    label: "Купить",
    message: `Здравствуйте! Хочу купить работу «${title}» за ${price}. ${pageUrl}`,
  };
}
