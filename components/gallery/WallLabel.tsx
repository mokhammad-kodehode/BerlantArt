"use client";

import Link from "next/link";

import { ArtworkViewer } from "@/components/gallery/ArtworkViewer";
import { ShareButton } from "@/components/gallery/ShareButton";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/** Как связаться с художницей; без заполненных переменных строки «Спросить» нет. */
export type FeedContacts = { whatsappPhone?: string; email?: string };

/**
 * Табличка у картины, как в музее (заказчик, 22.10.2026): название,
 * имя художницы, «Холст, масло · 50 × 50 см · 2023» и описание, если
 * оно не повторяет название. Под табличкой — тихая строка «Примерить
 * на стену · Поделиться» и «Спросить о картине»: на табличку кнопки
 * не помещаются, а наравне с ней спорили бы с картиной.
 *
 * Цены и статуса нет: продажа на сайте выключена (ARCHITECTURE.md,
 * «Продажа выключена»), о покупке договариваются в переписке.
 *
 * `isNear` — табличка у текущей картины или у соседней. Только им нужны
 * меню «Поделиться» и просмотр «других ракурсов»: у дальних картин они
 * никому не видны, а в ленте из двухсот работ лишними были бы двести
 * меню и окон.
 */
export function WallLabel({
  work,
  isMain,
  isNear,
  siteUrl,
  contacts,
}: {
  work: ArtworkFeedItem;
  /** Картина, ради которой открыли страницу: её название — заголовок страницы. */
  isMain: boolean;
  isNear: boolean;
  siteUrl: string;
  contacts: FeedContacts;
}) {
  const t = useDictionary();
  const lang = useLocale();
  const Heading = isMain ? "h1" : "h2";

  // В сообщение подставляется ссылка на саму работу: художница сразу
  // видит, о какой картине речь, и ей не нужно переспрашивать.
  const pageUrl = `${siteUrl}${localePath(lang, `/gallery/${work.id}`)}`;
  const message = t.work.message(work.title, pageUrl);
  const whatsappHref = contacts.whatsappPhone
    ? `https://wa.me/${contacts.whatsappPhone}?text=${encodeURIComponent(message)}`
    : null;
  const mailHref = contacts.email
    ? `mailto:${contacts.email}?subject=${encodeURIComponent(t.work.mailSubject(work.title))}&body=${encodeURIComponent(message)}`
    : null;
  // Описание вводится только по-русски (решение заказчика от 4.10.2026).
  const description = lang === "ru" ? work.description : null;

  return (
    <div className="wall-label-col">
      <div className="wall-label">
        <Heading className="wall-label-title">{work.title}</Heading>
        <p className="wall-label-artist">{t.site.artist}</p>
        {work.label[lang] && <p className="wall-label-meta">{work.label[lang]}</p>}
        {description && <p className="wall-label-text">{description}</p>}
      </div>

      {work.extra.length > 0 && (
        <ul aria-label={t.work.otherAngles} className="label-extra">
          {work.extra.map((src) => (
            <li key={src} className="label-extra-photo">
              {isNear ? (
                <ArtworkViewer src={src} title={work.title} openOnHash={false}>
                  <ArtworkImage src={src} alt={work.alt[lang]} sizes="56px" />
                </ArtworkViewer>
              ) : (
                <ArtworkImage src={src} alt={work.alt[lang]} sizes="56px" />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="label-actions">
        {/* Без фотографии примерять нечего — ссылки нет. */}
        {work.src && (
          <Link href={localePath(lang, `/gallery/${work.id}/room`)} className="label-link">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="1.5" />
              <rect x="7" y="7" width="10" height="10" />
            </svg>
            {t.work.tryOnWall}
          </Link>
        )}
        {isNear && <ShareButton url={pageUrl} title={work.title} showLabel />}
      </div>

      {(whatsappHref || mailHref) && (
        <p className="label-ask">
          {t.work.ask}{" "}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          )}
          {whatsappHref && mailHref && " · "}
          {mailHref && <a href={mailHref}>{t.contacts.email}</a>}
        </p>
      )}
    </div>
  );
}
