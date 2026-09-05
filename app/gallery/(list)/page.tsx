import type { Metadata } from "next";
import { z } from "zod";

import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { Header } from "@/components/layout/Header";
import { ArtworkTile } from "@/components/ui/ArtworkTile";
import { Container } from "@/components/ui/Container";
import { getArtworks, getCategories } from "@/lib/artworks";
import { cn } from "@/lib/cn";

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

/**
 * Размер плитки в сетке «стены».
 *
 * Формула из макета: каждая пятая работа занимает две строки, каждая
 * седьмая начиная с четвёртой — два столбца. Стена получается неровной,
 * как настоящая развеска, и при этом порядок не зависит от случайности:
 * одна и та же работа всегда встаёт на одно и то же место.
 *
 * Широкая плитка только с трёх столбцов: на телефоне их два, и растянутая
 * на всю ширину работа выбивалась бы из ряда.
 *
 * Живёт здесь, а не в самой плитке: это правило раскладки конкретно этой
 * стены, а плитка используется ещё и в ряду «других работ» на карточке.
 */
function spanClasses(index: number): string {
  return cn(index % 5 === 0 && "row-span-2", index % 7 === 3 && "md:col-span-2");
}

export const metadata: Metadata = {
  title: "Работы",
  description:
    "Живопись маслом и акрилом. Каждая картина — оригинал, выполненный вручную Берлан Джабраиловой.",
};

/**
 * Галерея. Свёрстана по design/mockups/Gallery.dc.html.
 *
 * Из макета сознательно не перенесён переключатель «Стена / Список»:
 * это второе представление тех же данных — вдвое больше разметки и
 * клиентское состояние ради пяти работ. Обоснование — в ARCHITECTURE.md.
 *
 * Страница читает `searchParams`, поэтому готовиться заранее ей больше
 * нельзя — маршрут стал динамическим. Это ожидаемо и записано в тикете:
 * выборок с фильтрами много, заранее их не подготовить. Уснувшая база
 * покажет `error.tsx` — для этого он и заведён в Э4-1.
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
    <>
      <Header />

      <main>
        <Container>
          <section className="max-w-[640px] pt-14 pb-8">
            <span className="text-accent-700 mb-4 block text-[13px] font-semibold tracking-[0.08em] uppercase">
              Галерея
            </span>
            <h1 className="mt-0 mb-4 text-[clamp(32px,4.5vw,48px)]">Работы</h1>
            <p className="text-ink/80 m-0 text-[16px] leading-relaxed">
              Живопись маслом и акрилом. Каждая картина — оригинал, выполненный вручную.
            </p>
          </section>
        </Container>

        <div className="bleed bg-neutral-900 pt-2 pb-16">
          <Container>
            <GalleryFilters current={filters} categories={categories} />

            {works.length === 0 ? (
              <div className="panel-dashed my-10 p-10">
                {/* Разный текст для «работ ещё нет» и «фильтр ничего не нашёл»:
                    иначе фильтр по «Проданные» на пустой выборке выглядел бы
                    так, будто сайт вообще без картин. */}
                {filters.status || filters.category ? (
                  <>
                    <h2 className="mt-0 mb-2 text-[20px] text-neutral-100">
                      По этому фильтру ничего нет
                    </h2>
                    <p className="m-0 max-w-[48ch] text-[14.5px] text-neutral-100/70">
                      Попробуйте другой статус или категорию.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-0 mb-2 text-[20px] text-neutral-100">Работ пока нет</h2>
                    <p className="m-0 max-w-[48ch] text-[14.5px] text-neutral-100/70">
                      Картины появятся здесь, как только художница добавит их.
                    </p>
                  </>
                )}
              </div>
            ) : (
              /*
                Сетка из макета: строки по 130px, плитки занимают одну или
                две — стена выходит неровной, как настоящая развеска.
                Столбцов на телефоне два, а не четыре: при четырёх работа
                на 375px ужималась бы до 80px и разглядеть её было бы нельзя.
              */
              <ul className="wall m-0 grid list-none auto-rows-[130px] grid-cols-2 gap-5 p-0 pt-10 md:grid-cols-3 lg:grid-cols-4">
                {works.map((work, index) => (
                  <ArtworkTile key={work.id} work={work} className={spanClasses(index)} />
                ))}
              </ul>
            )}
          </Container>
        </div>
      </main>
    </>
  );
}
