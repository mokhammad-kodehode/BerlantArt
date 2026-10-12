import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ArtworkSwipe } from "@/components/gallery/ArtworkSwipe";
import { ArtworkViewer } from "@/components/gallery/ArtworkViewer";
import { Header } from "@/components/layout/Header";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import type { ArtworkNeighbours } from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

/**
 * Показ одной работы во весь экран.
 *
 * Устроено так: фоном лежит та же фотография — размытая, увеличенная
 * и притушенная, — а поверх неё картина целиком, без обрезки. Размытый фон
 * нужен, потому что холсты бывают и вертикальные, и горизонтальные: вписать
 * картину в экран без полей нельзя, а чёрные поля по бокам выглядят как
 * ошибка. Фон из неё самой закрывает экран целиком и не спорит с живописью.
 *
 * Подпись (её передают через `children`) на десктопе прижата к левому
 * нижнему углу и лежит на затемнении, а не на картине: картина отодвинута
 * вправо отступом слева. На телефоне подпись уходит под картину обычным
 * потоком — перекрывать её на маленьком экране нечем.
 *
 * Зал (см. globals.css): верхний свет сверху, пол в нижней четверти,
 * потемнение по углам, а холст посажен на стену двойной тенью — короткой
 * контактной и мягкой рассеянной. Всё это постоянные градиенты: стена
 * в светлых залах имеет один и тот же тон при любой работе.
 *
 * Размытая копия картины фоном осталась только в тёмном зале. В светлых
 * её пробовали включить, и она красиво светилась, но перекрашивала стену
 * под каждый холст — у тёплого пейзажа желтела, у грозового неба серела.
 * Стена в зале так себя не ведёт.
 *
 * Шапку компонент подключает сам, вариантом `stage`, — чтобы она не
 * отвлекала от картины (заказчик, 12.10.2026; один вечер шапка стояла
 * плашкой, как в галерее, и заказчик вернул прежнее). На компьютере она
 * спрятана над экраном и выезжает, когда мышь подходит к верхнему краю
 * (globals.css, .stage-header-zone): картина сразу на весь экран. На
 * телефоне — тонкая прозрачная полоса 48px с одним бургером.
 *
 * Листание — «‹ 3 / 32 ›» под картиной (заказчик, 12.10.2026). Прежде это
 * были круги со стрелками по краям окна: на компьютере они висели посреди
 * стены отдельно от всего, на телефоне — наклейками рядом с холстом.
 * Счётчик заодно говорит, что работ больше одной и сколько их.
 *
 * Стрелки — обычные ссылки: переход между работами — навигация, адрес
 * каждой картины свой, и работает всё без JavaScript. Свайп и клавиши
 * ← → добавляет ArtworkSwipe. Кольцо замкнуто, соседей и номер
 * считает `getArtworkNeighbours`.
 */
export function ArtworkStage({
  lang,
  src,
  aspect,
  alt,
  title,
  priority,
  children,
  neighbours,
}: {
  lang: Locale;
  src?: string;
  /**
   * Пропорции фотографии, ширина к высоте, — из базы (Image.width/height).
   * По ним на телефоне и планшете строится блок картины. Нет размеров —
   * блок прежний, по остатку высоты экрана.
   */
  aspect?: number;
  /** Подпись картинки для поиска и скринридера: «Село» — картина маслом … */
  alt: string;
  /** Название работы — для кнопки «Открыть «…» во весь экран». */
  title: string;
  priority?: boolean;
  neighbours: ArtworkNeighbours;
  children: ReactNode;
}) {
  const t = getDictionary(lang).work;
  const { prev, next, position, total } = neighbours;
  const prevHref = prev ? localePath(lang, `/gallery/${prev.id}`) : undefined;
  const nextHref = next ? localePath(lang, `/gallery/${next.id}`) : undefined;
  const artBoxStyle: (CSSProperties & { "--art-ratio": number }) | undefined =
    aspect === undefined ? undefined : { "--art-ratio": aspect };
  const stageArt = (
    <ArtworkImage
      src={src}
      alt={alt}
      fit="contain"
      priority={priority}
      sizes="100vw"
      loader
      aspect={aspect}
      className="stage-art"
    />
  );

  return (
    <section className="bg-wall relative flex min-h-svh flex-col overflow-clip">
      {/*
        Фон и картина — одна и та же фотография с одинаковым `sizes`:
        браузер скачивает файл один раз и рисует его дважды. Разные `sizes`
        дали бы две закачки ради одного изображения.

        Обёртка скрыта от скринридера: это декоративный повтор картины,
        зачитывать её название дважды не нужно. Имя работы всё равно
        передаётся внутрь — по нему выбирается цвет заглушки, когда
        фотографии у работы ещё нет.
      */}
      <div aria-hidden className="absolute inset-0">
        <ArtworkImage src={src} alt={alt} sizes="100vw" className="stage-backdrop" />
      </div>

      <div className="stage-scrim pointer-events-none absolute inset-0" />

      {/*
        Стена, на которой висит холст. Отдельная плоскость поверх снимка
        зала, с резкой левой гранью и тенью в глубину — только десктоп
        и только зал «почти белый» (globals.css, .stage-wall).

        Пола под ней нет намеренно: картина висит на стене, а не стоит
        на полу. Прежняя версия набирала комнату градиентами, включая
        полосу пола внизу, — заказчик забраковал.
      */}
      <div aria-hidden className="stage-wall pointer-events-none" />

      {/*
        Зал: пол в нижней четверти и потемнение по углам (globals.css,
        .stage-hall). Лежит поверх подложки и скрима, но под содержимым —
        картина и подписи остаются выше.

        Зачем: в светлых залах фон был ровной заливкой, и холст висел
        в пустоте. Теперь под ним читается комната, а двойная тень
        (короткая контактная плюс мягкая рассеянная) сажает его на стену.
      */}
      <div aria-hidden className="stage-hall pointer-events-none absolute inset-0" />

      {/* Полоса у верхнего края: наведение на неё выдвигает шапку на
          компьютере (globals.css, .stage-header-zone). Стоит прямо перед
          шапкой — селектор «соседний элемент» иначе не сработает. */}
      <div aria-hidden className="stage-header-zone" />
      <Header variant="stage" />

      {/*
        Картина и подпись на десктопе лежат в одной клетке сетки: картина
        заполняет её, подпись прижата к низу слева. Прежде подпись была
        абсолютной, «приклеенной» к низу сцены, и в раскладке не участвовала:
        длинное описание росло вверх и заезжало под шапку — поймал заказчик
        на работе с описанием в семь строк. Теперь клетка вырастает под
        подпись, сцена становится выше экрана, и страница просто прокручивается.
      */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)]">
        {/*
        Высота картины набирается flex-ом, а не процентами: `h-full` внутри
        flex-контейнера с неопределённой высотой разрешался в ноль, и картина
        пропадала с экрана совсем — проверено в браузере.

        stage-art-area: поле под холстом добавляется только в зале
        «почти белый» (globals.css). Без него картина упиралась в нижний
        край окна и читалась обрезанной. В остальных залах холст стоит как
        стоял — тёмный зал заказчик просил не трогать.

        Ниже 1024px блок картины строится по пропорциям фото: во всю ширину,
        но не выше экрана без шапки — картина целиком на первом экране
        (96px = полоса шапки 48px, поле сверху 20px и запас под ряд
        «← Все работы … ‹ 3 / 32 ›», чтобы его край был виден).
        Прежде он брал остаток высоты после подписи, не меньше 46vh, и про
        ширину не знал: на планшете 768×1024 квадратная картина занимала
        507px — 66% ширины, а в окне пониже и того меньше (заказчик,
        8.10.2026). Без размеров фото в базе — прежний способ.

        На компьютере блок картины — ровно экран высотой и липкий: длинная
        подпись прокручивается рядом, а картина со стрелками под ней стоит
        на месте (заказчик, 12.10.2026). Липкость работает, потому что у
        сцены overflow: clip, а не hidden: hidden делает сцену своей
        областью прокрутки, и sticky внутри неё перестаёт прилипать.
      */}
        <div
          className={cn(
            "stage-art-area relative flex flex-1 flex-col px-5 pt-5 lg:sticky lg:top-0 lg:h-svh lg:self-start lg:p-12 lg:pb-[100px] lg:pl-[36%] lg:[grid-area:1/1]",
            aspect === undefined ? "min-h-[46vh]" : "max-lg:justify-center lg:min-h-[46vh]",
          )}
        >
          {/*
          Нажатие на картину открывает её на весь экран (ArtworkViewer).
          Без фотографии открывать нечего — заглушка остаётся как есть.
        */}
          <ArtworkSwipe
            prevHref={prevHref}
            nextHref={nextHref}
            style={artBoxStyle}
            className={cn(
              "relative flex-1 touch-pan-y touch-pinch-zoom",
              aspect !== undefined &&
                "max-lg:aspect-(--art-ratio) max-lg:max-h-[calc(100svh-96px)] max-lg:flex-none",
            )}
          >
            {src ? (
              <ArtworkViewer src={src} title={title} prev={prev} next={next}>
                {stageArt}
              </ArtworkViewer>
            ) : (
              stageArt
            )}
          </ArtworkSwipe>

          {/*
            Листание — под картиной (заказчик, 12.10.2026). Сначала ряд стоял
            первой строкой подписи, и в колонке шириной 27% он сжимал «Все
            работы» в две строки, а стрелки читались частью текста про эту
            картину, а не переходом к соседней.

            На телефоне ряд — в потоке между картиной и подписью: слева «Все
            работы», справа стрелки, в зоне большого пальца. На компьютере —
            внутри блока картины, прижат к его низу и выровнен по центру
            холста: левый отступ тот же 36%, что у картины. Нижнее поле
            картины на компьютере увеличено под этот ряд (globals.css,
            .stage-art-area). Полоса во всю ширину пропускает клики насквозь
            — иначе она закрыла бы подпись слева.

            Ряд лежит именно в блоке картины, а не отдельной клеткой сетки:
            прежде с длинным описанием клетка вырастала выше экрана, и ряд
            уезжал вместе с её низом за край (заказчик, 12.10.2026).

            Названия соседних работ — в подписях ссылок, а не только в
            стрелке: иначе скринридер прочитал бы «ссылка, стрелка влево».
            Счётчик для него — словами («Работа 3 из 32»).
          */}
          <nav
            aria-label={t.navLabel}
            className="relative z-[2] flex items-center justify-between gap-4 pt-3 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-0 lg:justify-center lg:px-12 lg:pt-0 lg:pb-7 lg:pl-[36%]"
          >
            <Link
              href={localePath(lang, "/gallery")}
              className="text-ink-soft hover:text-ink text-[14px] no-underline hover:underline lg:hidden"
            >
              {t.backToAll}
            </Link>

            {prevHref && nextHref && prev && next && (
              <div className="stage-pager lg:pointer-events-auto">
                <Link href={prevHref} rel="prev" aria-label={t.prev(prev.title)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 6-6 6 6 6" />
                  </svg>
                </Link>
                <span aria-hidden className="stage-pager-count">
                  {position} / {total}
                </span>
                <span className="sr-only">{t.position(position, total)}</span>
                <Link href={nextHref} rel="next" aria-label={t.next(next.title)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9.5 6 6 6-6 6" />
                  </svg>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/*
        Подпись на десктопе — ровно до грани стены (30%), с отступом 40px
        справа. При 48% заголовок наползал на стену; при 27% с полями по
        64px с обеих сторон описание сжималось в колонку в 4–5 слов
        (заказчик, 12.10.2026). Справа поле уже, чем слева: там его и так
        отделяет от картины стена.
      */}
        <div className="relative z-[2] px-[clamp(20px,5vw,64px)] pt-2 pb-10 lg:w-[30%] lg:self-end lg:pt-8 lg:pr-10 lg:pb-14 lg:[grid-area:1/1]">
          {/* На телефоне эта ссылка стоит в ряду со стрелками, под картиной. */}
          <Link
            href={localePath(lang, "/gallery")}
            className="text-ink-soft hover:text-ink mb-4 hidden text-[14px] no-underline hover:underline lg:inline-block"
          >
            {t.backToAll}
          </Link>

          {children}
        </div>
      </div>
    </section>
  );
}
