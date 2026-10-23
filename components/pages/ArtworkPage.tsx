import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArtworkFeed } from "@/components/gallery/ArtworkFeed";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/ui/JsonLd";
import {
  artworkFeedItem,
  artworkSeo,
  artworkTechnique,
  getArtworkById,
  primaryImageUrl,
} from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { getDictionary, type Locale } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";
import { artworkJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export async function artworkMetadata(lang: Locale, id: string): Promise<Metadata> {
  const t = getDictionary(lang);
  const work = await getArtworkById(id);

  // Запасной вариант, а не мёртвая ветка: без него `work.title` ниже
  // разыменовывает `null`. Увидеть этот заголовок нельзя — при отсутствии
  // работы страница отдаёт 404 и рисуется app/not-found.tsx со своим
  // заголовком; здесь он остаётся на случай, если над маршрутом когда-нибудь
  // снова появится заглушка загрузки и ответ пойдёт потоком.
  if (!work) {
    return { title: t.work.notFound };
  }

  // Заголовок и описание собраны из данных админки — без выдуманного.
  const { title, description, imageAlt } = artworkSeo(work, lang);
  const image = primaryImageUrl(work);
  const photo = work.images[0];

  return {
    title,
    description,
    alternates: pageAlternates(lang, `/gallery/${work.id}`),
    // Ссылка на работу в мессенджере показывает саму картину, а не общее
    // фото художницы. Размер — из базы, если он есть (AR-1): с ним
    // превью не прыгает, пока грузится.
    openGraph: {
      title,
      description,
      type: "article",
      ...(image
        ? {
            images: [
              {
                url: image,
                alt: imageAlt,
                ...(photo?.width && photo.height
                  ? { width: photo.width, height: photo.height }
                  : {}),
              },
            ],
          }
        : {}),
    },
  };
}

/**
 * Страница одной работы — лента всех работ, открытая на этой
 * (заказчик, 22.10.2026, макет «Лента с табличкой»): картина на стене,
 * рядом табличка, как в музее, и миниатюры остальных. Устройство ленты —
 * в components/gallery/ArtworkFeed.tsx.
 *
 * Сервер отдаёт только эту работу: её картину, табличку с заголовком
 * страницы и описание для поисковика. Остальные картины лента
 * дорисовывает в браузере по общему списку — от соседей страница не
 * зависит, и правка одной работы не пересобирает остальные (тикет О-5).
 *
 * Прежняя вёрстка (картина во весь экран, подпись в углу на затемнении,
 * стрелки «‹ 3 / 32 ›», панель «Все работы» поверх) заменена целиком.
 */
export async function ArtworkPage({ lang, id }: { lang: Locale; id: string }) {
  const t = getDictionary(lang);
  const work = await getArtworkById(id);

  if (!work) notFound();

  return (
    <>
      <JsonLd
        data={artworkJsonLd({
          base: siteUrl(),
          lang,
          artform: t.site.artform,
          id: work.id,
          title: work.title,
          // Описание вводится только по-русски (решение заказчика от
          // 4 октября 2026), и в английской версии русский абзац был бы чужим.
          description: lang === "ru" ? work.description : null,
          technique: artworkTechnique(work.technique, lang),
          dimensions: work.dimensions,
          year: work.year,
          image: primaryImageUrl(work),
          artistName: t.site.artist,
        })}
      />

      {/*
        Зал: на компьютере ровно в экран, лента прокручивается внутри него;
        на телефоне — во всю высоту ленты, страница прокручивается обычно
        (globals.css, «Лента работ»).

        Шапку подключает страница, вариантом `stage`, — чтобы она не
        отвлекала от картины (заказчик, 12.10.2026): на компьютере она
        спрятана над экраном и выезжает, когда мышь подходит к верхнему
        краю (globals.css, .stage-header-zone), на телефоне — тонкая полоса
        48px с одним бургером. Полоса для наведения стоит прямо перед
        шапкой — селектор «соседний элемент» иначе не сработает.
      */}
      <div className="feed-stage">
        <div aria-hidden className="stage-header-zone" />
        <Header variant="stage" />
        <main>
          <ArtworkFeed
            initial={artworkFeedItem(work)}
            siteUrl={clientEnv.NEXT_PUBLIC_SITE_URL}
            whatsappPhone={clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE}
          />
        </main>
      </div>
    </>
  );
}
