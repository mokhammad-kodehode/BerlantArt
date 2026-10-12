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
  const tiles = collageLayout(Array.from({ length: 4 }, () => ({ isLarge: false })));

  return (
    <main className="flex flex-1 flex-col">
      {/* Шапка — как в GalleryPage: надстрочник, строка поиска, ряд категорий. */}
      <div aria-hidden className="px-[clamp(20px,5vw,64px)] pt-5 pb-4 md:pt-7 md:pb-5">
        <div className="bg-ink/15 mb-3 h-3 w-20 rounded-full md:mb-4" />
        <div className="border-divider flex h-14 max-w-[720px] items-center border-b md:h-16">
          <div className="bg-ink/10 h-5 w-40 rounded-full" />
        </div>
        <div className="mt-4 flex gap-2.5 md:mt-5">
          {[120, 80, 120, 70].map((width, index) => (
            <div key={index} className="bg-ink/10 h-11 rounded-full" style={{ width }} />
          ))}
        </div>
      </div>

      <ul
        aria-hidden
        className="m-0 grid flex-1 list-none auto-rows-[minmax(150px,1fr)] grid-cols-2 gap-2.5 p-0 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)] md:auto-rows-[minmax(120px,1fr)] md:grid-cols-4"
      >
        {tiles.map((tile, index) => (
          <li key={index} className={`bg-ink/10 animate-pulse ${tile.className}`} />
        ))}
      </ul>
    </main>
  );
}
