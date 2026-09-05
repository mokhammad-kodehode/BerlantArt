import { Header } from "@/components/layout/Header";
import { Container } from "@/components/ui/Container";

/**
 * Скелет галереи на время ожидания данных.
 *
 * Перенесён сюда из Э4-1: общий скелет на весь сайт применился бы ко всем
 * маршрутам сразу и ни на одну страницу не был бы похож. Здесь он повторяет
 * ровно ту сетку, которая появится, — поэтому страница не «прыгает»,
 * когда данные приходят.
 *
 * Плиток восемь: столько помещается на первом экране десктопа. Показывать
 * ровно столько, сколько работ в базе, скелет не может — он рисуется до
 * того, как данные пришли.
 *
 * Лежит в папке `(list)` — это «группа маршрутов»: скобки в имени не попадают
 * в адрес, страница по-прежнему открывается как /gallery. Группа нужна, чтобы
 * скелет накрывал только список и НЕ накрывал /gallery/[id]. Пока он лежал
 * уровнем выше, ответ карточки начинал уходить потоком до того, как страница
 * успевала проверить, есть ли такая работа, — и несуществующая картина
 * отдавала 200 вместо 404. Заголовки уже отправлены, статус не переписать
 * (документация Next, loading.js → Status Codes).
 */
export default function GalleryLoading() {
  return (
    <>
      <Header />

      <main>
        <Container>
          <section className="max-w-[640px] pt-14 pb-8">
            <div className="bg-ink/10 mb-4 h-3.5 w-24 rounded-full" />
            <div className="bg-ink/15 mb-4 h-11 w-56 rounded-lg" />
            <div className="bg-ink/10 h-4 w-full max-w-[420px] rounded-full" />
          </section>
        </Container>

        <div className="bleed bg-neutral-900 pt-2 pb-16">
          <Container>
            <ul
              aria-hidden
              className="m-0 grid list-none auto-rows-[130px] grid-cols-2 gap-5 p-0 pt-10 md:grid-cols-3 lg:grid-cols-4"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <li
                  key={i}
                  className={`animate-pulse rounded-[14px] bg-neutral-800 ${i % 5 === 0 ? "row-span-2" : ""}`}
                />
              ))}
            </ul>
          </Container>
        </div>
      </main>
    </>
  );
}
