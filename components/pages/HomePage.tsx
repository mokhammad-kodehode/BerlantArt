import Link from "next/link";

import { ArtworkCollage } from "@/components/gallery/ArtworkCollage";
import { Hero } from "@/components/home/Hero";
import { PaintingReel } from "@/components/home/PaintingReel";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/ui/JsonLd";
import { countArtworks, getFeatured } from "@/lib/artworks";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { artistJsonLd, websiteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/site-url";

/**
 * Сколько работ на главной — по просьбе заказчика. 30 — шесть полных
 * блоков коллажа по пять, стена без хвоста-остатка. Остальное — в галерее,
 * кнопка на неё под стеной — только если там правда есть что-то ещё.
 */
const HOME_WORKS = 30;

/**
 * Главная. Собрана по макету design/mockups/Home.dc.html.
 *
 * Запросов в базу с этой страницы два — работы для стены и общее число
 * работ, — идут разом, и их число не растёт с числом картин.
 */
export async function HomePage({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const [featured, total] = await Promise.all([getFeatured(HOME_WORKS), countArtworks()]);
  // Сравнение с общим числом, а не с HOME_WORKS: в галерее есть и работы
  // без отметки «на главную», их на стене нет, но кнопка должна к ним вести.
  const hasMore = total > featured.length;

  const base = siteUrl();

  return (
    <>
      {/* Кто художница и что это за сайт — для расширенной выдачи Google
          и Яндекса. Только подтверждённое: имя, регион, Instagram. */}
      <JsonLd
        data={[
          artistJsonLd({
            base,
            lang,
            name: t.site.artist,
            description: t.site.description,
            jobTitle: t.site.jobTitle,
            region: t.site.region,
            image: "/og/berlant.jpg",
            sameAs: [site.instagram.url],
          }),
          websiteJsonLd({ base, lang, name: t.site.artist }),
        ]}
      />
      <Hero lang={lang} />

      {/* main вокруг стены: у страницы должна быть одна главная область,
          и после удаления секции «Выставки» ею стала стена работ. Hero
          снаружи намеренно — внутри него шапка, а шапке в main не место. */}
      <main>
        {/*
          Стена работ — тот же коллаж, что в галерее, тем же компонентом.
          Поля и заголовок сверху вернулись по просьбе заказчика: стена
          от края до края вплотную к hero сливалась с первым экраном —
          было не понять, где кончается одно и начинается другое.

          Поля на 20% шире, чем в галерее (24–77px вместо 20–64px, сверху
          58–115px вместо 48–96px), — тоже по просьбе заказчика: на главной
          стена — отдельная секция среди других, ей нужно больше воздуха.
        */}
        <section
          aria-labelledby="home-works-title"
          className="bg-wall px-[clamp(24px,6vw,77px)] pt-[clamp(58px,8.4vw,115px)] pb-[clamp(24px,6vw,77px)]"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-3 md:mb-8">
            <div>
              <span className="text-accent mb-2 block text-[13px] font-semibold tracking-[0.1em] uppercase">
                {t.home.wallKicker}
              </span>
              <h2 id="home-works-title" className="text-ink m-0 text-[clamp(26px,3.2vw,38px)]">
                {t.home.wallTitle}
              </h2>
            </div>
            <Link
              href={localePath(lang, "/gallery")}
              className="text-accent font-semibold no-underline hover:underline"
            >
              {t.home.allGallery}
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="panel-dashed p-9">
              <p className="text-ink-soft m-0 max-w-[46ch] text-[14px]">{t.home.empty}</p>
            </div>
          ) : (
            <>
              <ArtworkCollage works={featured} lang={lang} />

              {/* Кнопка под стеной, а не только ссылка над ней: досмотрев
                  тридцать работ, посетитель оказывается внизу, и путь
                  к остальным должен быть там, где он сейчас. */}
              {hasMore && (
                <div className="mt-[clamp(32px,4vw,48px)] flex justify-center">
                  <ButtonLink href={localePath(lang, "/gallery")} variant="primary" size="lg">
                    {t.home.seeAll}
                  </ButtonLink>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Видео на весь экран с надписью «Berlant Art», проявляющейся при
          прокрутке, — последним, перед подвалом, по просьбе заказчика.
          Прежде стояло сразу под первым экраном. */}
      <PaintingReel />
    </>
  );
}
