import { z } from "zod";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GallerySearch } from "@/components/gallery/GallerySearch";
import { ReturnToTile } from "@/components/gallery/ReturnToTile";
import { ButtonLink } from "@/components/ui/Button";
import { artworkCategories } from "@/lib/artwork-form";
import { artworkCategory, getArtworks, getCategories } from "@/lib/artworks";
import { categoriesMatching, galleryHref, normalizeSearch } from "@/lib/gallery-search";
import { getDictionary, type Locale } from "@/lib/i18n";

/**
 * Разбор параметров адреса — единственное место, где чужому вводу можно
 * верить только после проверки ([architecture.md](../../../.ai/rules/architecture.md)).
 *
 * `category` — обычная строка в схеме ([data.md](../../../.ai/rules/data.md)):
 * несуществующее значение просто даёт пустую выборку в базе, отдельной
 * проверки не требует. `.catch(undefined)` откатывает мусор к «без фильтра»
 * молча — так адрес с опечаткой не превращается в 500-ю.
 *
 * Фильтра по статусу нет: продажа на сайте выключена (ARCHITECTURE.md,
 * «Продажа выключена»). `?status=` из старых ссылок не читается вовсе.
 */
const filtersSchema = z.object({
  category: z.string().min(1).optional().catch(undefined),
  // Поиск: строка как есть — её показывает поле; к виду для базы её
  // приводит normalizeSearch (lib/gallery-search.ts).
  q: z.string().optional().catch(undefined),
});

/**
 * Галерея — стена-коллаж во весь экран.
 *
 * Светлой вступительной секции из макета здесь больше нет: она занимала
 * четверть первого экрана, а стена из пяти работ не дотягивала до его низа —
 * под коллажем оставалось пустое место в полэкрана. Теперь заголовок и
 * фильтры — узкая полоса сверху, сразу под ней коллаж во всю ширину.
 * Высота плиток считается от их ширины (см. ArtworkCollage), а не от
 * высоты окна. Отступление от макета записано в ARCHITECTURE.md.
 *
 * Размахи плиток считает lib/collage.ts, а не эта страница: там же лежит
 * и тест, который следит, чтобы в стене не появилось дыр при любом числе
 * работ.
 *
 * Страница читает `searchParams`, поэтому готовиться заранее ей нельзя —
 * маршрут динамический. Это ожидаемо: выборок с фильтрами много, заранее
 * их не подготовить. Уснувшая база покажет `error.tsx`.
 */
export async function GalleryPage({
  lang,
  searchParams,
}: {
  lang: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = getDictionary(lang).gallery;
  const rawParams = await searchParams;
  // Next отдаёт string[] для повторённого параметра (?category=A&category=B) —
  // берём первое значение, а не роняем страницу и не гадаем, какое верно.
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const filters = filtersSchema.parse({
    category: first(rawParams.category),
    q: first(rawParams.q),
  });
  const search = normalizeSearch(filters.q);
  // Пустой или из одних пробелов запрос — не запрос: в ссылки категорий
  // он не попадает.
  const current = { category: filters.category, q: search === undefined ? undefined : filters.q };
  // В английской версии запрос сверяется и с переводами категорий: в базе
  // они по-русски, и «flowers» иначе не нашёл бы «Цветы».
  const searchCategories =
    search === undefined || lang === "ru"
      ? []
      : categoriesMatching(search, artworkCategories, (category) =>
          artworkCategory(category, lang),
        );

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [works, categories] = await Promise.all([
    getArtworks({ category: filters.category, search, searchCategories }),
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
        <GallerySearch lang={lang} category={current.category} query={filters.q} />
        <div className="mt-4 md:mt-5">
          <GalleryFilters lang={lang} current={current} categories={categories} />
        </div>
      </div>

      {works.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-[clamp(20px,5vw,64px)] pb-8">
          <div className="panel-dashed w-full max-w-[560px] p-10">
            {/* Разный текст для «работ ещё нет» и «фильтр ничего не нашёл»:
                  иначе пустая категория выглядела бы так, будто сайт вообще
                  без картин. */}
            {search !== undefined ? (
              <>
                <h2 className="text-ink mt-0 mb-2 text-[20px]">
                  {t.emptySearchTitle(filters.q?.trim() ?? "")}
                </h2>
                <p className="text-ink-soft mt-0 mb-5 max-w-[48ch] text-[14px]">
                  {t.emptySearchText}
                </p>
                <ButtonLink href={galleryHref(lang, {})} variant="primary">
                  {t.showAll}
                </ButtonLink>
              </>
            ) : filters.category ? (
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
        <>
          <ArtworkCollage
            works={works}
            lang={lang}
            className="flex-1 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)]"
          />
          <ReturnToTile />
        </>
      )}
    </main>
  );
}
