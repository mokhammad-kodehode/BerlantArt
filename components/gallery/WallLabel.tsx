"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ArtworkViewer } from "@/components/gallery/ArtworkViewer";
import { ShareButton } from "@/components/gallery/ShareButton";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import type { ArtworkFeedItem } from "@/lib/artworks";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

/**
 * Напоминание о примерке (заказчик, 22.10.2026): иногда, пока картину
 * разглядывают, значок примерки оживает и над табличкой всплывает
 * подсказка. Шанс — 10% на картину, не чаще раза за посещение: чаще —
 * и это стало бы навязчивым, как реклама. Ждём полторы секунды, чтобы
 * не всплывать посреди листания, держим четыре с половиной.
 */
const nudgeChance = 0.1;
const nudgeDelay = 1500;
const nudgeDuration = 4500;

/**
 * Табличка у картины, как в музее (заказчик, 22.10.2026): название,
 * «Холст, масло · 50 × 50 см · 2023», описание, если оно не повторяет
 * название, а в строке названия справа — значки примерки и «Поделиться».
 * Имени художницы на табличке нет (заказчик, 23.10.2026): сайт одной
 * художницы, и имя повторялось бы у каждой из двухсот картин.
 *
 * Значок примерки — рамка на гвоздике, которая качается при наведении,
 * как только что повешенная картина (заказчик: «чтобы было интересно
 * нажать», «иконку или что-то оригинальное»). Прежде здесь была
 * маленькая комната с этой картиной над диваном — заказчик её отклонил.
 * Значок ведёт в примерочную (TICKETS-primerka.md): там рама, камера
 * телефона и фото своей стены — на телефоне и на компьютере. У работы,
 * которую честно не примерить (размер не читается или расходится
 * с фото, `canvas`), значка нет.
 *
 * Строки «Спросить о картине» нет по просьбе заказчика: написать
 * художнице можно из меню в шапке.
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
  isCurrent,
  siteUrl,
}: {
  work: ArtworkFeedItem;
  /** Картина, ради которой открыли страницу: её название — заголовок страницы. */
  isMain: boolean;
  isNear: boolean;
  /** Картина сейчас на экране — только у неё может всплыть напоминание о примерке. */
  isCurrent: boolean;
  siteUrl: string;
}) {
  const t = useDictionary();
  const lang = useLocale();
  const [isNudging, setIsNudging] = useState(false);
  // Табличка живёт, пока открыта лента, — «кубик» бросается один раз на
  // картину за посещение, сколько бы раз к ней ни возвращались.
  const hasRolled = useRef(false);
  const canTryOn = work.canvas !== null;

  useEffect(() => {
    if (!isCurrent || !canTryOn || hasRolled.current) return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      hasRolled.current = true;
      if (Math.random() >= nudgeChance) return;
      setIsNudging(true);
      hide = setTimeout(() => setIsNudging(false), nudgeDuration);
    }, nudgeDelay);
    // Ушли с картины раньше — не всплываем, а всплывшее прячем.
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      setIsNudging(false);
    };
  }, [isCurrent, canTryOn]);

  const Heading = isMain ? "h1" : "h2";
  const pageUrl = `${siteUrl}${localePath(lang, `/gallery/${work.id}`)}`;
  // Описание вводится только по-русски (решение заказчика от 4.10.2026).
  const description = lang === "ru" ? work.description : null;

  return (
    // data-long — табличка с описанием: на компьютере ей можно быть шире (globals.css).
    <div className="wall-label-col" data-long={description ? true : undefined}>
      <div className="wall-label" data-nudging={isNudging || undefined}>
        {/* Напоминание о примерке — облачко над табличкой, носиком к
            значку. Видно только при data-nudging (globals.css,
            .tryon-nudge); скринридеру оно ни к чему — у значка своя
            подпись, а внезапная фраза посреди чтения сбивала бы. */}
        {canTryOn && (
          <span aria-hidden className="tryon-nudge">
            {t.work.tryOnNudge}
          </span>
        )}
        {/* Название — слева, примерка и «Поделиться» — значками справа, в
            той же строке (заказчик, 22.10.2026): отдельный ряд кнопок под
            линией делал табличку выше, чем ей нужно. Слова у значков —
            в подсказке при наведении и в подписи для скринридера. */}
        <div className="wall-label-head">
          <Heading className="wall-label-title">{work.title}</Heading>
          <div className="label-actions">
            {canTryOn && (
              // prefetch={false} — как у плиток стены: иначе лента из двухсот
              // картин заранее собирала бы их примерочные (записи в кеш Vercel).
              <Link
                href={localePath(lang, `/gallery/${work.id}/room`)}
                prefetch={false}
                aria-label={t.work.tryOnCamera}
                title={t.work.tryOnCamera}
                className="tryon"
              >
                {/* Рамка на гвоздике: петля, холст с пейзажем внутри. При
                    наведении рамка качается на гвозде, как только что
                    повешенная картина (globals.css, .tryon-frame). */}
                <svg viewBox="0 0 24 24" aria-hidden="true" className="tryon-icon">
                  <g className="tryon-frame">
                    <path d="M12 2.6 6.4 8.6M12 2.6l5.6 6" />
                    <rect x="3.5" y="8.6" width="17" height="12.4" rx="0.6" />
                    <path d="m6.5 18 3.4-3.6 2.4 2.3 2-1.9 3.2 3.2" />
                    <circle cx="15.6" cy="12" r="1.1" />
                  </g>
                  <circle cx="12" cy="2.6" r="1.2" className="tryon-nail" />
                </svg>
              </Link>
            )}
            {isNear && <ShareButton url={pageUrl} title={work.title} />}
          </div>
        </div>
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
    </div>
  );
}
