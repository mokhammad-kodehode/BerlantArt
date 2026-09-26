import type { ReactNode } from "react";

import type { Contact } from "@/lib/contacts";

/**
 * Значок способа связи: WhatsApp, телефон, Telegram, Instagram, Facebook, почта.
 *
 * Нарисован встроенным SVG, а не взят из пакета иконок: значков шесть,
 * а пакет ради них — лишняя зависимость ([components.md](../../.ai/rules/components.md)).
 * Контуры — по мотивам Lucide (лицензия ISC), линией, а не заливкой:
 * так значки одного веса с текстом и не спорят с живописью фирменными
 * цветами.
 *
 * Цвет берётся от текста (`currentColor`), подпись — у ссылки рядом,
 * поэтому сам значок скрыт от скринридера.
 */
export function ContactIcon({ id, className }: { id: Contact["id"]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[id]}
    </svg>
  );
}

const paths: Record<Contact["id"], ReactNode> = {
  // Облачко с хвостиком внизу слева и трубка внутри — узнаваемый знак WhatsApp.
  // Трубка уменьшена в 0.42 раза, и линия у неё толще во столько же раз
  // (1.6 / 0.42 ≈ 3.8) — иначе она сжалась бы вместе с рисунком.
  // non-scaling-stroke не годится: он держит толщину в пикселях экрана,
  // и на значке в 18px трубка выходила толще облачка.
  whatsapp: (
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path
        transform="translate(6.96 6.96) scale(0.42)"
        strokeWidth={3.8}
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  telegram: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9 22 2z" />
    </>
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
};
