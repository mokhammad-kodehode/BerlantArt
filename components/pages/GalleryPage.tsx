import type { Metadata } from "next";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GallerySearch } from "@/components/gallery/GallerySearch";
import { ButtonLink } from "@/components/ui/Button";
import { artworkCategories } from "@/lib/artwork-form";
import { artworkCategory, getCategories, getGalleryTiles } from "@/lib/artworks";
import {
  categoriesMatching,
  galleryHref,
  normalizeSearch,
  type GalleryQuery,
} from "@/lib/gallery-search";
import { getDictionary, type Locale } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";

/**
 * Заголовок и описание галереи — одни на все её адреса: всю галерею,
 * категорию и поиск. Канонический адрес у всех тоже один, `/gallery`:
 * фильтры дают десятки адресов с той же стеной, и поисковик иначе счёл
 * бы их копиями.
 */
export function galleryMetadata(lang: Locale): Metadata {
  const t = getDictionary(lang).gallery;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: pageAlternates(lang, "/gallery"),
  };
}

/**
 * Галерея — стена во весь экран, развеской, как на главной (заказчик,
 * 23.10.2026; ArtworkCollage).
 *
 * Светлой вступительной секции из макета здесь больше нет: она занимала
 * четверть первого экрана, а стена из пяти работ не дотягивала до его низа —
 * под стеной оставалось пустое место в полэкрана. Теперь заголовок и
 * фильтры — узкая полоса сверху, сразу под ней стена во всю ширину.
 * Размер картин считается от ширины стены (см. ArtworkCollage), а не от
 * высоты окна. Отступление от макета записано в ARCHITECTURE.md.
 *
 * Параметров адреса страница не читает — выбор приходит от маршрута
 * (тикет О-11, lib/gallery-routes.ts). Вся галерея и каждая категория
 * поэтому готовятся заранее и не ходят в базу на каждый заход; живым
 * запросом остаётся только поиск. Уснувшая база покажет `error.tsx`
 * только в поиске.
 */
export async function GalleryPage({ lang, query }: { lang: Locale; query: GalleryQuery }) {
  const t = getDictionary(lang).gallery;
  const search = normalizeSearch(query.q);
  // Пустой или из одних пробелов запрос — не запрос: в ссылки категорий
  // он не попадает.
  const current = { category: query.category, q: search === undefined ? undefined : query.q };
  // В английской версии запрос сверяется и с переводами категорий: в базе
  // они по-русски, и «flowers» иначе не нашёл бы «Цветы».
  const searchCategories =
    search === undefined || lang === "ru"
      ? []
      : categoriesMatching(search, artworkCategories, (category) =>
          artworkCategory(category, lang),
        );

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [tiles, categories] = await Promise.all([
    getGalleryTiles({ category: query.category, search, searchCategories }, lang),
    getCategories(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      {/*
        Шапка галереи — надстрочник, под ним поиск, под ним категории
        (заказчик, 12.10.2026). Поле на компьютере длиной 720px, а не во
        всю ширину: строка с линией через весь экран в 1440px выглядела
        пустой полосой, а запрос длиннее пары слов никто не набирает. Заголовок «Работы» и абзац «Нажмите на
        работу…» убраны: они повторяли пункт меню и отодвигали стену вниз,
        а что работу можно открыть, видно и так. Единственный h1 страницы —
        «Галерея», оформленный надстрочником, как и был.
      */}
      <div className="px-[clamp(20px,5vw,64px)] pt-5 pb-4 md:pt-7 md:pb-5">
        <h1 className="text-accent font-body mt-0 mb-3 text-[13px] font-semibold tracking-[0.1em] uppercase md:mb-4">
          {t.kicker}
        </h1>
        <GallerySearch lang={lang} category={current.category} query={query.q} />
        <div className="mt-4 md:mt-5">
          <GalleryFilters lang={lang} current={current} categories={categories} />
        </div>
      </div>

      {tiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-[clamp(20px,5vw,64px)] pb-8">
          <div className="panel-dashed w-full max-w-[560px] p-10">
            {/* Разный текст для «работ ещё нет» и «фильтр ничего не нашёл»:
                  иначе пустая категория выглядела бы так, будто сайт вообще
                  без картин. */}
            {search !== undefined ? (
              <>
                <h2 className="text-ink mt-0 mb-2 text-[20px]">
                  {t.emptySearchTitle(query.q?.trim() ?? "")}
                </h2>
                <p className="text-ink-soft mt-0 mb-5 max-w-[48ch] text-[14px]">
                  {t.emptySearchText}
                </p>
                <ButtonLink href={galleryHref(lang, {})} variant="primary">
                  {t.showAll}
                </ButtonLink>
              </>
            ) : query.category ? (
              <>
                <h2 className="text-ink mt-0 mb-2 text-[20px]">{t.emptyFilteredTitle}</h2>
                <p className="text-ink-soft m-0 max-w-[48ch] text-[14px]">{t.emptyFilteredText}</p>
              </>
            ) : (
              <>
                <h2 className="text-ink mt-0 mb-2 text-[20px]">{t.emptyTitle}</h2>
                <p className="text-ink-soft m-0 max-w-[48ch] text-[14px]">{t.emptyText}</p>
              </>
            )}
          </div>
        </div>
      ) : (
        /* `flex-1` держит подвал внизу, когда по фильтру работ мало
             и стена не дотягивает до конца экрана. */
        <ArtworkCollage
          tiles={tiles}
          lang={lang}
          moreLabel={t.showMore}
          className="flex-1 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)]"
        />
      )}
    </main>
  );
}
