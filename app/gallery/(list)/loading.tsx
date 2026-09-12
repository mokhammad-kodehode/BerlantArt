import { Header } from "@/components/layout/Header";
import { collageLayout } from "@/lib/collage";

/**
 * Скелет галереи на время ожидания данных.
 *
 * Повторяет ровно ту стену, которая появится, — поэтому страница не
 * «прыгает», когда данные приходят. Раскладка берётся той же функцией
 * (lib/collage.ts), что и у настоящего коллажа: иначе скелет и стена
 * разошлись бы при первой же правке формулы.
 *
 * Плиток четыре — один полный блок раскладки. Сколько работ в базе, скелет
 * знать не может: он рисуется до того, как пришёл ответ.
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
  const tiles = collageLayout(4);

  return (
    <div className="bg-wall flex min-h-svh flex-col">
      <Header />

      <main className="flex flex-1 flex-col">
        <div className="px-[clamp(20px,5vw,64px)] pt-7 pb-5">
          <div className="bg-ink/15 mb-3 h-3 w-20 rounded-full" />
          <div className="bg-ink/20 mb-3 h-9 w-48 rounded-lg" />
          <div className="bg-ink/10 h-3.5 w-full max-w-[420px] rounded-full" />
        </div>

        <ul
          aria-hidden
          className="m-0 grid flex-1 list-none auto-rows-[minmax(150px,1fr)] grid-cols-2 gap-2.5 p-0 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)] md:auto-rows-[minmax(120px,1fr)] md:grid-cols-4"
        >
          {tiles.map((tile, index) => (
            <li
              key={index}
              className={`bg-ink/10 animate-pulse rounded-[14px] ${tile.className}`}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}
