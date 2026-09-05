import type { Metadata } from "next";

import { ArtworkTile } from "@/components/gallery/ArtworkTile";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/ui/Container";
import { getArtworks } from "@/lib/artworks";

/**
 * Та же логика, что на главной: без этой строки страница стала бы
 * динамической и ходила в базу на каждое открытие, а уснувшая база роняла
 * бы галерею. Значение обязано быть числом-литералом.
 *
 * В Э4-4 появятся фильтры через параметры адреса, и маршрут станет
 * динамическим — это ожидаемо и правильно: выборок много, заранее
 * их не подготовить.
 */
export const revalidate = 300;

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
 */
export default async function GalleryPage() {
  const works = await getArtworks();

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
            {works.length === 0 ? (
              <div className="panel-dashed my-10 p-10">
                <h2 className="mt-0 mb-2 text-[20px] text-neutral-100">Работ пока нет</h2>
                <p className="m-0 max-w-[48ch] text-[14.5px] text-neutral-100/70">
                  Картины появятся здесь, как только художница добавит их.
                </p>
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
                  <ArtworkTile key={work.id} work={work} index={index} />
                ))}
              </ul>
            )}
          </Container>
        </div>
      </main>
    </>
  );
}
