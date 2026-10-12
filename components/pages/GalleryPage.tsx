import { z } from "zod";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { getArtworks, getCategories } from "@/lib/artworks";
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
  });

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [works, categories] = await Promise.all([getArtworks(filters), getCategories()]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-[clamp(20px,5vw,64px)] pt-5 pb-4 md:pt-7 md:pb-5">
        <div>
          <span className="text-accent mb-2 block text-[13px] font-semibold tracking-[0.1em] uppercase">
            {t.kicker}
          </span>
          <h1 className="text-ink mt-0 mb-1.5 text-[clamp(26px,3.2vw,38px)]">{t.title}</h1>
          {/* На телефоне абзац скрыт: вместе с тремя рядами фильтров он
                отодвигал стену почти на половину экрана, а тапнуть по работе
                и так очевидно. На десктопе места хватает. */}
          <p className="text-ink-soft m-0 hidden max-w-[46ch] text-[14px] leading-relaxed md:block">
            {t.lead}
          </p>
        </div>

        <GalleryFilters lang={lang} current={filters} categories={categories} />
      </div>

      {works.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-[clamp(20px,5vw,64px)] pb-8">
          <div className="panel-dashed w-full max-w-[560px] p-10">
            {/* Разный текст для «работ ещё нет» и «фильтр ничего не нашёл»:
                  иначе пустая категория выглядела бы так, будто сайт вообще
                  без картин. */}
            {filters.category ? (
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
          works={works}
          lang={lang}
          className="flex-1 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)]"
        />
      )}
    </main>
  );
}
