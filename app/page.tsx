import Link from "next/link";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { Hero } from "@/components/home/Hero";
import { PaintingReel } from "@/components/home/PaintingReel";
import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { getFeatured } from "@/lib/artworks";

/**
 * Как часто страница перерисовывается заново, в секундах.
 *
 * Без этой строки главная стала бы динамической — запрос в базу на каждое
 * открытие. С ней она снова готовится заранее: посетитель получает готовый
 * HTML, а уснувшая база (бесплатный тариф Supabase засыпает через неделю
 * простоя) не роняет главную — отдаётся последняя удачная версия.
 *
 * Значение обязано быть числом-литералом: Next читает его при сборке,
 * и выражение вроде 60 * 5 он не разберёт.
 *
 * Плата — правка через админку появится с задержкой до пяти минут. На этапе 6
 * админка вызовет revalidatePath("/"), и задержка исчезнет.
 */
export const revalidate = 300;

/**
 * Главная. Собрана по макету design/mockups/Home.dc.html.
 *
 * Запрос в базу с этой страницы один — работы для стены, — и их число
 * не растёт с числом картин.
 */
export default async function HomePage() {
  const featured = await getFeatured();

  return (
    <>
      <Hero />

      {/*
        Стена работ — тот же коллаж, что в галерее, тем же компонентом.
        Прежняя лента «Из мастерской» (горизонтальная прокрутка, работы
        в рамках-паспарту) убрана по просьбе заказчика: рамки и подписи
        капслоком спорили с живописью, а картины в ленте были мелкими.
      */}
      <section className="bg-wall px-[clamp(20px,5vw,64px)] pt-14 pb-14">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-ink m-0 text-[clamp(24px,3vw,32px)]">Работы</h2>
          <Link href="/gallery" className="text-accent font-semibold no-underline hover:underline">
            Вся галерея →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="panel-dashed p-9">
            <p className="text-ink/70 m-0 max-w-[46ch] text-[14px]">
              Работы для главной пока не выбраны. Все картины — в галерее.
            </p>
          </div>
        ) : (
          /* Высота задаётся здесь: строки сетки — 1fr, и без неё коллаж
             сожмётся до минимальной высоты строки. 72vh — чтобы стена
             читалась как отдельный экран, но не прятала следующую секцию. */
          <ArtworkCollage works={featured} className="min-h-[72vh]" />
        )}
      </section>

      {/*
        Ширина как у стены работ выше — те же поля clamp(20px,5vw,64px)
        и никакого ограничения в 1200px. Прежде main сидел в Container,
        и после стены почти во всю ширину блоки ниже читались как
        ступенька: картины до края, а текст в узкой колонке.
        Строки при этом не разъезжаются: их держит max-width у самих
        абзацев, а не у всей колонки.
      */}
      <main className="px-[clamp(20px,5vw,64px)]">
        {/* Выставки: пустое состояние, пока событий нет. Отступ сверху свой:
            раньше его давал блок «Первый холст — в 54 года», убранный
            с главной по просьбе заказчика (история — на /about). */}
        <section className="pt-14 pb-18">
          <div className="panel-dashed flex flex-wrap items-center justify-between gap-5 p-10">
            <div>
              <Tag tone="outline">Выставки</Tag>
              <h3 className="mt-4 mb-2">Ближайшие события скоро появятся здесь</h3>
              <p className="text-ink/70 m-0 max-w-[48ch]">
                Следите за расписанием выставок и показов работ Берлант.
              </p>
            </div>
            <ButtonLink href="/contact" variant="ghost">
              Написать художнице →
            </ButtonLink>
          </div>
        </section>
      </main>

      {/* Видео на весь экран с надписью «Berlant Art», проявляющейся при
          прокрутке, — последним, перед подвалом, по просьбе заказчика.
          Прежде стояло сразу под первым экраном. */}
      <PaintingReel />
    </>
  );
}
