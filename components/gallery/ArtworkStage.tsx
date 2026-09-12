import Link from "next/link";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import type { ArtworkLink } from "@/lib/artworks";

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
 * В светлых залах размытой копии нет вовсе (см. globals.css): там холст
 * висит на белой стене под верхним светом, с мягкой тенью под ним — это
 * и есть музейный приём, размывать там нечего.
 *
 * Шапку компонент подключает сам, вариантом `stage`: прозрачная, но текст
 * берётся из темы — в белом зале светлые надписи на белой стене исчезли бы.
 * Тёмная плашка не годится: она отрезала бы верх изображения.
 *
 * Стрелки листают работы в порядке галереи. Это обычные ссылки, а не кнопки
 * с обработчиком: переход между работами — навигация, адрес каждой картины
 * остаётся своим, и работает всё без JavaScript. Кольцо замкнуто, соседей
 * считает `getArtworkNeighbours`.
 *
 * Где они стоят, зависит от экрана. На десктопе — по краям окна, там для них
 * есть свободное поле. На телефоне окна нет: стрелки ложились на нижние углы
 * холста и выглядели наклейками на живописи — поэтому ниже 1024px они
 * выходят из картины в отдельный ряд между холстом и подписью, прижатый
 * вправо, в зону большого пальца.
 */
export function ArtworkStage({
  src,
  alt,
  priority,
  children,
  prev,
  next,
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  prev?: ArtworkLink | null;
  next?: ArtworkLink | null;
  children: ReactNode;
}) {
  return (
    <section className="bg-wall relative flex min-h-svh flex-col overflow-hidden">
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

      <Header variant="stage" />

      {/*
        Высота картины набирается flex-ом, а не процентами: `h-full` внутри
        flex-контейнера с неопределённой высотой разрешался в ноль, и картина
        пропадала с экрана совсем — проверено в браузере.
      */}
      <div className="relative flex min-h-[46vh] flex-1 flex-col p-5 lg:p-12 lg:pl-[36%]">
        <div className="relative flex-1">
          <ArtworkImage
            src={src}
            alt={alt}
            fit="contain"
            priority={priority}
            sizes="100vw"
            className="stage-art"
          />
        </div>
      </div>

      {/*
        Ряд со стрелками. На телефоне он в обычном потоке и потому раздвигает
        картину и подпись; на десктопе становится прозрачной накладкой во всю
        сцену, внутри которой стрелки встают по краям (клики сквозь неё
        проходят — pointer-events-none на самой накладке).

        Названия соседних работ — в подписи ссылки, а не только в стрелке:
        иначе скринридер прочитал бы «ссылка, стрелка влево».
      */}
      {(prev || next) && (
        <nav
          aria-label="Листание работ"
          className="relative z-[2] flex justify-end gap-2.5 px-[clamp(20px,5vw,64px)] pt-3 lg:pointer-events-none lg:absolute lg:inset-0 lg:p-0"
        >
          {prev && (
            <Link
              href={`/gallery/${prev.id}`}
              rel="prev"
              aria-label={`Предыдущая работа: «${prev.title}»`}
              className="stage-nav lg:left-5"
            >
              ←
            </Link>
          )}

          {next && (
            <Link
              href={`/gallery/${next.id}`}
              rel="next"
              aria-label={`Следующая работа: «${next.title}»`}
              className="stage-nav lg:right-5"
            >
              →
            </Link>
          )}
        </nav>
      )}

      <div className="relative z-[2] px-[clamp(20px,5vw,64px)] pt-2 pb-10 lg:absolute lg:bottom-0 lg:left-0 lg:max-w-[48%] lg:pb-14">
        {children}
      </div>
    </section>
  );
}
