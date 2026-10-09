import Image from "next/image";

import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { BrushStroke } from "@/components/ui/BrushStroke";
import { ButtonLink } from "@/components/ui/Button";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { paintingYear } from "@/lib/site";

/**
 * Первый экран. Снимок один — художница в мастерской, его выбрала она сама,
 * — а раскладка зависит от ширины.
 *
 * Десктоп — по макету design/mockups/Home.dc.html: слева текст на фоне зала,
 * справа фото на всю высоту до края окна.
 *
 * Телефон — «журнальная обложка»: сверху крупно девиз и строка о том, что
 * она начала в 53, под ними фото во всю ширину с чёткими краями, ниже
 * кнопки. Абзац про 2020 год на телефоне скрыт: заказчик решил, что на
 * первом экране он не обязателен, история есть на /about.
 *
 * Заголовок — девиз, а не имя (вариант 2, заказчик 9.10.2026): имя
 * крупно стоит в шапке по центру прямо над ним, два имени подряд
 * читались повтором. Прежде здесь были надстрочник «Портфолио», имя
 * и девиз мельче под фото.
 *
 * Как сюда пришли, чтобы не переигрывать: две половины «текст + полоска
 * фото» спорили; фото на весь экран с текстом поверх приближало
 * горизонтальный кадр втрое («слишком близко»); квадрат, растворяющийся
 * в фоне, — промежуточный шаг перед этим вариантом. Вертикальный кадр
 * «у мольберта» пробовали и вернули: художница хочет именно этот снимок.
 *
 * Имя и остальной текст — два отдельных блока, а не один: на телефоне
 * между ними встаёт фото. Порядок задают области сетки (grid-template-areas),
 * а не дублированная разметка: заголовок h1 на странице должен быть один.
 *
 * Видео, которое раньше лежало здесь фоном, — отдельная секция в конце
 * главной (PaintingReel), по просьбе заказчика.
 *
 * ВРЕМЕННО: кадр сгенерирован нейросетью, а не снят. Заменить настоящей
 * фотографией — docs/tekst-o-hudozhnitse.md, раздел 6.
 */
export function Hero({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);

  return (
    <section className="bg-bg flex min-h-svh flex-col">
      {/* stage, а не solid: шапка прозрачная и не липкая — на первом экране
          она часть композиции, а высоту экрана делят она и содержимое. */}
      <Header variant="stage" />

      {/*
        Телефон: имя, фото, остальное — друг под другом, фото забирает всю
        оставшуюся высоту (1fr). Десктоп: две колонки, фото справа во всю
        высоту, а имя и остальное слева — между двумя пустыми строками 1fr,
        так что вместе стоят по центру колонки. Строки пополам (1fr 1fr)
        не годились: нижний блок выше верхнего, и текст съезжал на 56px вниз.
        minmax(4rem, …) — поля сверху и снизу на невысоком окне.
      */}
      <div className="grid flex-1 grid-cols-1 grid-rows-[auto_1fr_auto] [grid-template-areas:'title'_'photo'_'rest'] min-[900px]:grid-cols-[41fr_59fr] min-[900px]:grid-rows-[minmax(4rem,1fr)_auto_auto_minmax(4rem,1fr)] min-[900px]:[grid-template-areas:'._photo'_'title_photo'_'rest_photo'_'._photo']">
        <div className="px-[clamp(20px,5vw,64px)] pt-6 pb-6 [grid-area:title] min-[900px]:py-0">
          {/*
            Заголовок — девиз, а не имя (вариант 2, заказчик 9.10.2026):
            имя крупно стоит в шапке прямо над ним, и два имени подряд
            читались повтором. Для поисковика и скринридера имя остаётся
            началом заголовка — скрытым текстом: главный заголовок
            страницы должен говорить, чей это сайт.

            «нет цели!» подчёркнуто тем же мазком мастихина, что пункт меню;
            он ложится чуть позже, когда заголовок уже прочитан.
          */}
          <h1 className="text-ink m-0 text-[clamp(42px,11.5vw,58px)] leading-[1.05] min-[900px]:text-[clamp(44px,5vw,76px)]">
            <span className="sr-only">{t.site.artist}. </span>
            {t.hero.motto.lead}{" "}
            <span className="relative inline-block whitespace-nowrap">
              <BrushStroke className="hero-stroke" delay={0.45} duration={1.1} />
              <span className="relative">{t.hero.motto.accent}</span>
            </span>
          </h1>
          {/* На телефоне — короткая строка вместо абзаца `story`: тот
              скрыт там по решению заказчика, а без подписи девиз остался
              бы без героя. */}
          <p className="text-ink-soft mt-4 mb-0 text-[16px] leading-relaxed min-[900px]:hidden">
            {t.hero.subline}
          </p>
        </div>

        {/*
          Кадр 3:2 срезается слева, но не вплотную к правому краю.
          Десктоп — 72%: при 1280px object-right срезал руку с мастихином.
          Телефон — 80%: лицо правее центра, в кадре и рука с мастихином.
          Замерено по кадру: рука на ~23% ширины, лицо на ~72%.

          260px — нижняя граница для низких экранов: ниже снимок превращается
          в полоску, лучше пусть первый экран станет выше окна.
        */}
        <div className="relative min-h-[260px] [grid-area:photo]">
          <Image
            src="/about/berlant-v-masterskoy.webp"
            alt={t.hero.photoAlt}
            fill
            preload
            sizes="(min-width: 900px) 59vw, 100vw"
            className="object-cover object-[80%_center] min-[900px]:object-[72%_center]"
          />
        </div>

        <div className="flex flex-col gap-6 px-[clamp(20px,5vw,64px)] pt-6 pb-8 [grid-area:rest] min-[900px]:gap-7 min-[900px]:pt-5 min-[900px]:pb-0">
          {/*
            Только подтверждённое самой художницей: масло (акрил она
            не называла), возраст, отсутствие школы и что пишет каждый день.
            Прежний текст из макета обещал выставки, которых нечем подтвердить.
            На телефоне скрыт — см. описание компонента.
          */}
          <p className="text-ink-soft m-0 hidden max-w-[46ch] text-base leading-relaxed min-[900px]:block">
            {t.hero.story(t.hero.yearOrdinal(paintingYear()))}
          </p>

          {/* Главное действие одно — галерея. «О художнице» — ссылка, а не
              вторая кнопка: две кнопки рядом спорили за внимание. */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink href={localePath(lang, "/gallery")} variant="primary" size="lg">
              {t.hero.toGallery}
            </ButtonLink>
            <Link
              href={localePath(lang, "/about")}
              className="group text-ink decoration-ink/35 hover:decoration-ink text-base font-medium underline underline-offset-[6px] transition-colors"
            >
              {t.hero.toAbout}{" "}
              {/* Стрелка уезжает вправо при наведении и фокусе — подсказка
                  «туда», а не украшение. inline-block — иначе transform на
                  строчном элементе не работает. */}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
