import type { HangStyle } from "@/components/gallery/ArtworkCollage";

/**
 * Скелет поиска по галерее на время ожидания данных.
 *
 * Повторяет ту стену, которая появится, — поэтому страница не «прыгает»,
 * когда данные приходят. Развеска та же — класс `.wall-hang` в обёртке
 * `@container`, что и у настоящей стены (ArtworkCollage): иначе скелет
 * и стена разошлись бы при первой же правке размеров.
 *
 * Плиток четыре, пропорции — типичные для холстов: квадрат, вертикаль,
 * горизонталь. Сколько работ найдётся и какие, скелет знать не может:
 * он рисуется до того, как пришёл ответ.
 *
 * Только у поиска (тикет О-11): вся галерея и категории готовы заранее
 * и приходят сразу, скелет им лишний — он добавлял подмену содержимого
 * уже после того, как страница пришла.
 *
 * Скелет не должен накрывать /gallery/[id]. Пока он лежал уровнем выше,
 * ответ карточки начинал уходить потоком до того, как страница успевала
 * проверить, есть ли такая работа, — и несуществующая картина отдавала
 * 200 вместо 404. Заголовки уже отправлены, статус не переписать
 * (документация Next, loading.js → Status Codes).
 */
/** Пропорции плиток скелета: квадрат, вертикаль, горизонталь, квадрат. */
const tiles: HangStyle[] = [1, 0.8, 1.25, 1].map((ratio) => ({ "--r": ratio }));

export default function GalleryLoading() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Шапка — как в GalleryPage: надстрочник, строка поиска, ряд категорий. */}
      <div
        aria-hidden
        className="mx-auto w-full max-w-(--wall-max) px-[clamp(20px,5vw,64px)] pt-5 pb-4 md:pt-7 md:pb-5"
      >
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

      <div
        aria-hidden
        className="@container mx-auto w-full max-w-(--wall-max) flex-1 px-[clamp(20px,5vw,64px)] pb-[clamp(20px,5vw,64px)]"
      >
        <ul className="wall-hang">
          {tiles.map((style, index) => (
            <li key={index} className="bg-ink/10 animate-pulse" style={style} />
          ))}
        </ul>
      </div>
    </main>
  );
}
