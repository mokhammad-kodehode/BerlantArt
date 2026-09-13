import type { Metadata } from "next";
import { z } from "zod";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { Header } from "@/components/layout/Header";
import { getArtworks, getCategories } from "@/lib/artworks";

/**
 * Разбор параметров адреса — единственное место, где чужому вводу можно
 * верить только после проверки ([architecture.md](../../../.ai/rules/architecture.md)).
 *
 * `status` проверяется строго: это перечисление в Prisma, и значение вне
 * трёх вариантов уронило бы запрос ошибкой типа, а не просто вернуло пусто.
 * `.catch(undefined)` откатывает мусор к «без фильтра» молча — так адрес
 * с опечаткой не превращается в 500-ю.
 *
 * `category` — обычная строка в схеме ([data.md](../../../.ai/rules/data.md)):
 * несуществующее значение просто даёт пустую выборку в базе, отдельной
 * проверки не требует.
 */
const filtersSchema = z.object({
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD"]).optional().catch(undefined),
  category: z.string().min(1).optional().catch(undefined),
});

export const metadata: Metadata = {
  title: "Работы",
  description:
    "Живопись маслом и акрилом. Каждая картина — оригинал, выполненный вручную Берлант Джабраиловой.",
};

/**
 * Галерея — стена-коллаж во весь экран.
 *
 * Светлой вступительной секции из макета здесь больше нет: она занимала
 * четверть первого экрана, а стена из пяти работ не дотягивала до его низа —
 * под коллажем оставалось пустое место в полэкрана. Теперь заголовок и
 * фильтры — узкая полоса сверху, а коллаж растягивается на всю оставшуюся
 * высоту окна: строки заданы как `1fr`, поэтому пяти работ хватает, чтобы
 * закрыть экран целиком, а тридцать просто уедут за его край. Отступление
 * от макета записано в ARCHITECTURE.md.
 *
 * Размахи плиток считает lib/collage.ts, а не эта страница: там же лежит
 * и тест, который следит, чтобы в стене не появилось дыр при любом числе
 * работ.
 *
 * Страница читает `searchParams`, поэтому готовиться заранее ей нельзя —
 * маршрут динамический. Это ожидаемо: выборок с фильтрами много, заранее
 * их не подготовить. Уснувшая база покажет `error.tsx`.
 */
export default async function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  const rawParams = await searchParams;
  // Next отдаёт string[] для повторённого параметра (?status=A&status=B) —
  // берём первое значение, а не роняем страницу и не гадаем, какое верно.
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const filters = filtersSchema.parse({
    status: first(rawParams.status),
    category: first(rawParams.category),
  });

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [works, categories] = await Promise.all([getArtworks(filters), getCategories()]);

  return (
    <div className="bg-wall flex min-h-svh flex-col">
      <Header />

      <main className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-[clamp(20px,5vw,64px)] pt-5 pb-4 md:pt-7 md:pb-5">
          <div>
            <span className="text-accent mb-2 block text-[12px] font-semibold tracking-[0.1em] uppercase">
              Галерея
            </span>
            <h1 className="text-ink mt-0 mb-1.5 text-[clamp(26px,3.2vw,38px)]">Работы</h1>
            {/* На телефоне абзац скрыт: вместе с тремя рядами фильтров он
                отодвигал стену почти на половину экрана, а тапнуть по работе
                и так очевидно. На десктопе места хватает. */}
            <p className="text-ink/70 m-0 hidden max-w-[46ch] text-[14.5px] leading-relaxed md:block">
              Живопись маслом и акрилом. Нажмите на работу — она откроется во весь экран.
            </p>
          </div>

          <GalleryFilters current={filters} categories={categories} />
        </div>

        {works.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-[clamp(20px,5vw,64px)] pb-8">
            <div className="panel-dashed w-full max-w-[560px] p-10">
              {/* Разный текст для «работ ещё нет» и «фильтр ничего не нашёл»:
                  иначе фильтр по «Проданные» на пустой выборке выглядел бы
                  так, будто сайт вообще без картин. */}
              {filters.status || filters.category ? (
                <>
                  <h2 className="text-ink mt-0 mb-2 text-[20px]">По этому фильтру ничего нет</h2>
                  <p className="text-ink/70 m-0 max-w-[48ch] text-[14.5px]">
                    Попробуйте другой статус или категорию.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-ink mt-0 mb-2 text-[20px]">Работ пока нет</h2>
                  <p className="text-ink/70 m-0 max-w-[48ch] text-[14.5px]">
                    Картины появятся здесь, как только художница добавит их.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          /*
            `flex-1` на сетке и строки `1fr` в ней — это и есть «стена на всю
            страницу»: свободная высота окна уходит строкам, а не остаётся
            пустой полосой под коллажем. Минимум у строки всё же задан, иначе
            при двадцати работах плитки сплющились бы в полоски.
          */
          <ArtworkCollage
            works={works}
            className="flex-1 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)]"
          />
        )}
      </main>
    </div>
  );
}
