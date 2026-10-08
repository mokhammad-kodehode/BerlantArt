import Image from "next/image";

import { Header } from "@/components/layout/Header";
import { ArtworkTile } from "@/components/ui/ArtworkTile";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import { getFeatured } from "@/lib/artworks";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/**
 * История художницы.
 *
 * ВЕСЬ ТЕКСТ НА ЭТОЙ СТРАНИЦЕ ЖДЁТ ПРАВКИ ХУДОЖНИЦЫ. Он собран по рассказу
 * её сына (13.09.2026) и записан в docs/o-hudozhnitse-chernovik.md — там же
 * отдельным списком помечены фразы, которые являются истолкованием, а не
 * сказанным: про краски вместо слов, про готовый глаз, про «не ради
 * выставок». Их Берлант должна подтвердить или вычеркнуть.
 *
 * Чего здесь намеренно нет: выставок и собраний. Про них известно только
 * «висят в галереях и у известных людей» — без единого названия, города
 * и года такую фразу писать нельзя ([content.md](../../.ai/rules/content.md)).
 *
 * Отступления от макета (записаны в ARCHITECTURE.md):
 * — блок «Тёплый свет, узнаваемый почерк» заменён на «Дар, о котором она
 *   не знала»: прежний текст был рыбой и приписывал работам колорит,
 *   которого художница не называла;
 * — фон панели — surface, а не тональный accent-100: тональные ряды
 *   не переключаются по залам и в тёмном зале давали нечитаемый текст;
 * — вторая кнопка ведёт в Instagram, а не на /contact: этой страницы
 *   ещё нет, а ссылка в 404 хуже отсутствующей ([quality.md](../../.ai/rules/quality.md)).
 */
export async function AboutPage({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const a = t.about;
  // Четыре работы в конце страницы — вместо голой пары кнопок. Столько же,
  // сколько в ряду сетки: пятая создала бы обрывок второй строки.
  const featured = await getFeatured(4);

  return (
    <>
      <Header />

      <main>
        <Container>
          {/*
            Портрет и текст рядом, как в макете: 0.85fr под фотографию,
            1.15fr под текст. Ниже 900px колонки схлопываются в одну —
            на телефоне портрет в половину ширины нечитаем.
          */}
          <section className="grid grid-cols-1 items-center gap-14 pt-16 pb-14 min-[900px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            {/*
              ВРЕМЕННО: портрет сгенерирован нейросетью по кадру из
              телерепортажа, а не снят. Заменить настоящей фотографией —
              требования к съёмке в docs/tekst-o-hudozhnitse.md, раздел 6.

              С полки за её спиной убрана рамка с семейной фотографией —
              по просьбе заказчика. Закрыта продолжением той же картины,
              взятым выше без масштабирования: растянутая полоса давала
              вертикальные разводы. Прямоугольник x 524-644, y 256-386,
              растушёвка краёв 18px.

              Соотношение 3:4 из макета совпадает с исходником (896×1200),
              поэтому кадр не режется. sizes — по реальной ширине отрисовки:
              в колонке 0.85fr контейнера 1200px это ~440px.
            */}
            <figure className="rounded-panel relative m-0 aspect-3/4 overflow-hidden">
              <Image
                src="/about/berlant-u-molberta.webp"
                alt={a.portraitAlt}
                fill
                sizes="(min-width: 900px) 440px, 100vw"
                className="object-cover"
                priority
              />
            </figure>

            <div>
              <Tag tone="accent2">{a.tag}</Tag>
              <h1 className="mt-4 mb-5 text-[clamp(32px,4.5vw,52px)]">{a.heading}</h1>
              <p className="text-ink-soft mt-0 mb-4 text-[16px] leading-relaxed">{a.intro[0]}</p>
              <p className="text-ink-soft m-0 text-[16px] leading-relaxed">{a.intro[1]}</p>
            </div>
          </section>

          <section className="pt-6 pb-14">
            <h2 className="mt-0 mb-2 text-[26px]">{a.pathTitle}</h2>
            <div className="flex flex-col">
              {a.milestones.map((milestone, index) => (
                <div
                  key={milestone.label}
                  className={
                    // Разделитель между вехами, но не под последней —
                    // висящая линия в конце секции выглядит как обрыв.
                    "border-divider grid grid-cols-1 gap-2 py-7 sm:grid-cols-[120px_1fr] sm:gap-6" +
                    (index < a.milestones.length - 1 ? " border-b" : "")
                  }
                >
                  <p className="font-heading text-accent m-0 text-[22px]">{milestone.label}</p>
                  <div>
                    <h3 className="mt-0 mb-1.5 text-[18px]">{milestone.title}</h3>
                    <p className="text-ink-soft m-0 max-w-[56ch]">{milestone.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Container>

        {/*
          Здесь стоит самое личное в тексте — про потерю мужа. Написано
          одной фразой и без нажима: читатель сам поймёт, а слова вроде
          «трагедия» превратили бы биографию в рекламный текст.
          Если художница не захочет этого упоминания, убирается первый
          абзац целиком — остальное держится само.

          Тёмная полоса, а не светлая панель: страница шла тремя светлыми
          секциями подряд и читалась одним полотном. Чередование светлых
          секций с тёмными во всю ширину — приём дизайн-системы, и на
          ellajonesdesign.com.au он же держит ритм всей биографии.
          Самый личный кусок текста — самое естественное место для него.
        */}
        <section className="mb-14 bg-neutral-900 py-16">
          <Container>
            {/*
              Текст слева, фотография справа. В шапке страницы порядок
              обратный — так две пары «фото и текст» не выглядят одной
              и той же раскладкой, повторённой дважды.

              Кадр показан целиком в своей пропорции 3:2. Сначала он стоял
              полосой во всю ширину окна высотой 520px, и это оказалось
              вдвойне плохо: object-cover выхватывал среднюю треть и срезал
              художнице голову — оставался подбородок, — а растянутый на всю
              ширину монитора снимок ещё и терял резкость. Здесь 2048
              пикселей исходника ложатся примерно в 500, то есть с запасом
              даже на экраны двойной плотности.

              ВРЕМЕННО: кадр сгенерирован нейросетью, а не снят. Заменить
              настоящей фотографией — docs/tekst-o-hudozhnitse.md, раздел 6.
            */}
            <div className="grid grid-cols-1 items-center gap-12 min-[900px]:grid-cols-[1fr_0.9fr]">
              <div className="max-w-[640px]">
                <h2 className="mt-0 mb-4 text-[26px] text-neutral-100">{a.giftTitle}</h2>
                <p className="mt-0 mb-4 text-[16px] leading-relaxed text-neutral-300">
                  {a.gift[0]}
                </p>
                <p className="m-0 text-[16px] leading-relaxed text-neutral-300">{a.gift[1]}</p>
              </div>

              <figure className="rounded-panel relative m-0 aspect-3/2 w-full overflow-hidden">
                <Image
                  src="/about/berlant-v-masterskoy.webp"
                  alt={a.studioAlt}
                  fill
                  sizes="(min-width: 900px) 500px, 100vw"
                  className="object-cover"
                />
              </figure>
            </div>
          </Container>
        </section>

        <Container>
          <section className="pb-14">
            <h2 className="mt-0 mb-4 text-[26px]">{a.subjectsTitle}</h2>
            <p className="text-ink-soft mt-0 mb-4 max-w-[62ch] text-[16px] leading-relaxed">
              {a.subjects[0]}
            </p>
            <p className="text-ink-soft m-0 max-w-[62ch] text-[16px] leading-relaxed">
              {a.subjects[1]}
            </p>
          </section>
        </Container>

        {/*
          Тёмная полоса во всю ширину окна — приём дизайн-системы
          (design-system.md). Девиз стоит и на главной, но только здесь
          объясняется, откуда он взялся.

          Полоса стоит СНАРУЖИ Container, а не внутри через класс `.bleed`:
          тот задан шириной 100vw, а она включает полосу прокрутки, и на
          странице с вертикальным скроллом документ вылезал за окно на её
          ширину. Так же сделана стена работ на главной.
        */}
        <section className="mb-14 bg-neutral-900 px-[clamp(20px,5vw,64px)] py-16 text-center">
          <p className="font-heading m-0 text-[clamp(24px,3.5vw,38px)] leading-snug text-neutral-100">
            {a.quote(t.site.slogan)}
          </p>
          <p className="mx-auto mt-5 mb-0 max-w-[52ch] text-[16px] leading-relaxed text-neutral-300">
            {a.motto}
          </p>
        </section>

        <Container>
          {/*
            Лента работ вместо голой пары кнопок в конце. На референсе эту
            роль играет сетка Instagram в подвале: страница заканчивается
            не призывом, а живой работой. Тянуть настоящую ленту через
            Instagram нельзя — нужен их API и согласия, — поэтому показаны
            работы из нашей же базы, а ссылка ведёт в её профиль.
          */}
          <section className="pb-20">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="m-0 text-[26px]">{a.latestTitle}</h2>
              <ExternalButtonLink href={site.instagram.url} variant="ghost">
                Instagram @{site.instagram.handle} →
              </ExternalButtonLink>
            </div>

            {featured.length > 0 && (
              <ul className="mb-8 grid grid-cols-2 gap-4 p-0 sm:grid-cols-4">
                {featured.map((work) => (
                  <ArtworkTile
                    key={work.id}
                    work={work}
                    lang={lang}
                    sizes="(max-width: 639px) 50vw, (max-width: 1199px) 25vw, 264px"
                  />
                ))}
              </ul>
            )}

            <ButtonLink href={localePath(lang, "/gallery")} variant="primary">
              {a.seeAll}
            </ButtonLink>
          </section>
        </Container>
      </main>
    </>
  );
}
