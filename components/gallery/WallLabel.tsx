"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ArtworkViewer } from "@/components/gallery/ArtworkViewer";
import { ShareButton } from "@/components/gallery/ShareButton";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

type SceneStyle = CSSProperties & { "--ratio": number };

/**
 * Табличка у картины, как в музее (заказчик, 22.10.2026): название,
 * имя художницы, «Холст, масло · 50 × 50 см · 2023», описание, если
 * оно не повторяет название, и под линией — примерка и «Поделиться».
 *
 * Примерка — не строчка текста, а маленькая комната: эта же картина
 * на стене над диваном и подпись «как она будет смотреться у вас»
 * (заказчик: «чтобы было интересно нажать»). Сразу видно, что за
 * ссылкой, — ради этого её и открывают. Строки «Спросить о картине»
 * нет по просьбе заказчика: написать художнице можно из меню в шапке.
 *
 * Цены и статуса нет: продажа на сайте выключена (ARCHITECTURE.md,
 * «Продажа выключена»).
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
}: {
  work: ArtworkFeedItem;
  /** Картина, ради которой открыли страницу: её название — заголовок страницы. */
  isMain: boolean;
  isNear: boolean;
  siteUrl: string;
}) {
  const t = useDictionary();
  const lang = useLocale();
  const Heading = isMain ? "h1" : "h2";
  const pageUrl = `${siteUrl}${localePath(lang, `/gallery/${work.id}`)}`;
  // Описание вводится только по-русски (решение заказчика от 4.10.2026).
  const description = lang === "ru" ? work.description : null;
  const sceneStyle: SceneStyle = { "--ratio": work.ratio ?? 1 };

  return (
    <div className="wall-label-col">
      <div className="wall-label">
        <Heading className="wall-label-title">{work.title}</Heading>
        <p className="wall-label-artist">{t.site.artist}</p>
        {work.label[lang] && <p className="wall-label-meta">{work.label[lang]}</p>}
        {description && <p className="wall-label-text">{description}</p>}

        <div className="label-actions">
          {/* Без фотографии примерять нечего — примерки нет. */}
          {work.src && (
            <Link href={localePath(lang, `/gallery/${work.id}/room`)} className="tryon">
              <span aria-hidden className="tryon-scene" style={sceneStyle}>
                <span className="tryon-art">
                  <Image src={work.src} alt="" fill sizes="48px" className="object-cover" />
                </span>
                {/* Тот же диван, что в примерочной, — уменьшенная копия
                    240px, 2.8 КБ вместо 57 (public/room/sofa-mini.webp). */}
                <Image
                  src="/room/sofa-mini.webp"
                  alt=""
                  width={240}
                  height={98}
                  className="tryon-sofa"
                />
              </span>
              <span className="tryon-text">
                <span className="tryon-title">{t.work.tryOnWall}</span>
                <span className="tryon-hint">{t.work.tryOnHint}</span>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="tryon-arrow">
                <path d="M5 12h13m-5-5 5 5-5 5" />
              </svg>
            </Link>
          )}
          {isNear && <ShareButton url={pageUrl} title={work.title} showLabel />}
        </div>
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
    </div>
  );
}
