import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FittingRoom } from "@/components/gallery/FittingRoom";
import { roomPageUrl } from "@/lib/ar-links";
import { artworkFeedItem, getArtworkById } from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { getDictionary, type Locale } from "@/lib/i18n";
import { localePath } from "@/lib/i18n/config";
import { qrPath } from "@/lib/qr";

export async function roomMetadata(lang: Locale, id: string): Promise<Metadata> {
  const t = getDictionary(lang);
  const work = await getArtworkById(id);
  if (!work) return { title: t.work.notFound };

  return {
    title: t.room.title(work.title),
    // Та же картина, что на странице работы, только в другой подаче.
    // В поиске ей появляться незачем — там должна быть сама страница работы.
    robots: { index: false, follow: true },
  };
}

/**
 * Примерочная (TICKETS-primerka.md): картина и рама, дальше — камера
 * телефона или фото своей стены. Устройство — в
 * components/gallery/FittingRoom.tsx, рамы — в lib/room-options.ts.
 *
 * Параметров адреса страница не читает: выбор рамы из ссылки читает
 * браузер. Поэтому она готовится один раз, при первом заходе, и дальше
 * отдаётся готовой (решение 4) — один запрос в базу на работу, а не на
 * каждый заход.
 *
 * Работу, которую нельзя примерить честно — размер не читается или
 * расходится с фото, — примерочная не показывает и ведёт к самой работе:
 * значка на её табличке и так нет, сюда приходят только по старой ссылке.
 *
 * Шапки сайта здесь нет, как в полноэкранном просмотре: путь назад —
 * «К работе» в углу.
 */
export async function RoomPage({ lang, id }: { lang: Locale; id: string }) {
  const work = await getArtworkById(id);
  if (!work) notFound();

  const item = artworkFeedItem(work);
  if (item.src === undefined || item.canvas === null) {
    redirect(localePath(lang, `/gallery/${id}`));
  }

  // Код для телефона — на эту же примерочную, без рамы: страница одна на
  // все рамы и готовится заранее, выбор с компьютера ей не виден.
  const qr = qrPath(`${clientEnv.NEXT_PUBLIC_SITE_URL}${roomPageUrl(id, null, lang)}`);

  return (
    <main>
      <FittingRoom
        phoneCode={
          <svg
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            className="fit-qr-code"
            role="img"
            aria-label={getDictionary(lang).room.qrLabel}
            shapeRendering="crispEdges"
          >
            <rect width={qr.size} height={qr.size} fill="#ffffff" />
            <path d={qr.path} fill="#111111" />
          </svg>
        }
        work={{
          id: item.id,
          title: item.title,
          src: item.src,
          alt: item.alt[lang],
          canvas: item.canvas,
          arVersion: item.arVersion,
        }}
        siteUrl={clientEnv.NEXT_PUBLIC_SITE_URL}
        whatsappPhone={clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE}
      />
    </main>
  );
}
