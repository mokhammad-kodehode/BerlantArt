import Image from "next/image";
import Link from "next/link";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { Hero } from "@/components/home/Hero";
import { ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { getFeatured, primaryImageUrl } from "@/lib/artworks";

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
 * Работы для первого экрана и для ленты — одна и та же выборка: запрос
 * в базу с этой страницы ровно один, и их число не растёт с числом картин.
 */
export default async function HomePage() {
  const featured = await getFeatured();

  return (
    <>
      {/*
        Hero клиентский, поэтому получает не работы целиком, а три поля,
        которые ему нужны: остальное просто уехало бы в браузер без пользы.
      */}
      <Hero
        slides={featured.map((work) => ({
          id: work.id,
          title: work.title,
          imageUrl: primaryImageUrl(work),
        }))}
      />

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
            <p className="text-ink/70 m-0 max-w-[46ch] text-[14.5px]">
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
        {/*
            Тизер истории художницы — полная версия на /about.

            Текст. Прежний («тёплый колорит», «признание дома») был рыбой
            из макета: этих слов художница не говорила. Заменён на то, что
            она подтвердила сама — см. docs/o-hudozhnitse-chernovik.md.
            Окончательная формулировка ждёт её правки.

            Раскладка. Фотография слева, текст справа — приём
            с ellajonesdesign.com.au, по просьбе заказчика. Прежде здесь был
            один текст в панели, и сразу после первого экрана с живописью он
            читался как объявление. Ниже 900px колонки схлопываются: портрет
            в половину ширины телефона не читается.

            Снимок тот же, что открывает /about, и это намеренно: блок ведёт
            ровно на ту страницу, и человек узнаёт её, когда туда попадает.
            Понадобится разный — нужен третий кадр.

            Фон панели — залозависимый surface, а не тональный accent-2-100:
            тональные ряды заданы фиксированно и не переключаются по залам,
            и в тёмном зале светлый текст на бледно-зелёном давал контраст
            1.05 — заголовок был не виден вовсе.
          */}
        <section className="pt-14 pb-12">
          <div className="rounded-panel border-divider bg-surface grid grid-cols-1 items-center gap-10 border p-[clamp(24px,4vw,56px)] min-[900px]:grid-cols-[0.8fr_1.2fr]">
            <figure className="rounded-card relative m-0 aspect-3/4 overflow-hidden">
              <Image
                src="/about/berlant-u-molberta.webp"
                alt="Берлант Джабраилова кладёт мастихином мазок на холст с башней"
                fill
                sizes="(min-width: 900px) 360px, 100vw"
                className="object-cover"
              />
            </figure>

            <div className="max-w-[64ch]">
              <h2 className="mt-0 mb-5 text-[clamp(30px,3.6vw,46px)] leading-[1.1]">
                Первый холст — в 54 года
              </h2>
              <p className="text-ink/80 mt-0 mb-4 text-[15.5px] leading-relaxed">
                В 2020 году, в день своего рождения, Берлант купила небольшой холст и масляные
                краски и написала первую картину. Ни художественной школы, ни единого урока
                рисования за плечами не было.
              </p>
              <p className="text-ink/80 mt-0 mb-6 text-[15.5px] leading-relaxed">
                Сегодня она пишет каждый день — маслом, кистью и мастихином. Её сюжеты: чеченские
                башни, старинная архитектура, вещи, за которыми стоит история.
              </p>
              <ButtonLink href="/about" variant="secondary">
                Читать историю →
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Выставки: пустое состояние, пока событий нет */}
        <section className="pb-18">
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
    </>
  );
}
