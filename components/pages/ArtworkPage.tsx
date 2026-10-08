import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkStage } from "@/components/gallery/ArtworkStage";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { ArtworkTile } from "@/components/ui/ArtworkTile";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/ui/JsonLd";
import { cameraTarget } from "@/lib/ar";
import {
  artworkCategory,
  artworkDimensions,
  artworkSeo,
  artworkTechnique,
  getArtworkById,
  getArtworkNeighbours,
  getOtherArtworks,
  imageUrl,
  primaryImageUrl,
} from "@/lib/artworks";
import { contactEmail } from "@/lib/contacts";
import { clientEnv } from "@/lib/env";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { pageAlternates } from "@/lib/page-metadata";
import { artworkJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export async function artworkMetadata(lang: Locale, id: string): Promise<Metadata> {
  const t = getDictionary(lang);
  const work = await getArtworkById(id);

  // Запасной вариант, а не мёртвая ветка: без него `work.title` ниже
  // разыменовывает `null`. Увидеть этот заголовок нельзя — при отсутствии
  // работы страница отдаёт 404 и рисуется app/not-found.tsx со своим
  // заголовком; здесь он остаётся на случай, если над маршрутом когда-нибудь
  // снова появится заглушка загрузки и ответ пойдёт потоком.
  if (!work) {
    return { title: t.work.notFound };
  }

  // Заголовок и описание собраны из данных админки — без выдуманного.
  const { title, description, imageAlt } = artworkSeo(work, lang);
  const image = primaryImageUrl(work);
  const photo = work.images[0];

  return {
    title,
    description,
    alternates: pageAlternates(lang, `/gallery/${work.id}`),
    // Ссылка на работу в мессенджере показывает саму картину, а не общее
    // фото художницы. Размер — из базы, если он есть (AR-1): с ним
    // превью не прыгает, пока грузится.
    openGraph: {
      title,
      description,
      type: "article",
      ...(image
        ? {
            images: [
              {
                url: image,
                alt: imageAlt,
                ...(photo?.width && photo.height
                  ? { width: photo.width, height: photo.height }
                  : {}),
              },
            ],
          }
        : {}),
    },
  };
}

/**
 * Страница одной работы: картина во весь экран, подпись — в левом нижнем
 * углу поверх затемнения, как в превью у стриминговых сервисов.
 *
 * Прежняя вёрстка (картина в квадратной рамке слева, таблица свойств справа)
 * заменена по просьбе заказчика: разглядеть в ней живопись было нельзя —
 * репродукция занимала чуть больше трети экрана. Теперь холст занимает всю
 * высоту окна, а текст лежит на размытом фоне сбоку и картину не закрывает.
 * Устройство показа — в components/gallery/ArtworkStage.tsx.
 *
 * Таблицы свойств больше нет: из четырёх полей у работ заполнены одно-два,
 * и таблица в две строки выглядела пустой. Те же данные собраны в строку
 * через разделитель — по-прежнему без выдуманных значений
 * ([content.md](../../../.ai/rules/content.md)).
 */
export async function ArtworkPage({ lang, id }: { lang: Locale; id: string }) {
  const t = getDictionary(lang);

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [work, others, neighbours] = await Promise.all([
    getArtworkById(id),
    getOtherArtworks(id),
    getArtworkNeighbours(id),
  ]);

  if (!work) notFound();

  const extraImages = work.images.slice(1);

  // Незаполненное поле исчезает целиком, а не превращается в прочерк:
  // врать о габаритах картины нельзя, даже когда она не продаётся.
  // Категории здесь нет намеренно — она уже стоит надстрочником над
  // названием, и в строке получалось «Холст, масло · Архитектурный мотив»
  // при надстрочнике «АРХИТЕКТУРНЫЙ МОТИВ».
  const meta = [
    work.year,
    artworkTechnique(work.technique, lang),
    artworkDimensions(work.dimensions, lang),
  ]
    .filter(Boolean)
    .join(" · ");

  // Описание вводится в админке только по-русски (решение заказчика от
  // 4 октября 2026), и в английской версии русский абзац был бы чужим.
  const description = lang === "ru" ? work.description : null;

  // Цены, статуса и кнопки «Купить» нет: продажа на сайте выключена до
  // платного тарифа Vercel и оплаты через интернет (ARCHITECTURE.md,
  // «Продажа выключена»). О покупке человек и художница договариваются
  // в переписке, поэтому сообщение одно для всех работ — без цены.
  //
  // В сообщение подставляется ссылка на саму работу: художница сразу видит,
  // о какой картине речь, и ей не нужно переспрашивать.
  const pageUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}${localePath(lang, `/gallery/${work.id}`)}`;
  const message = t.work.message(work.title, pageUrl);
  const phone = clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE;
  const mailSubject = t.work.mailSubject(work.title);
  const hasMore = extraImages.length > 0 || others.length > 0;

  return (
    <>
      <JsonLd
        data={artworkJsonLd({
          base: siteUrl(),
          lang,
          artform: t.site.artform,
          id: work.id,
          title: work.title,
          description,
          technique: artworkTechnique(work.technique, lang),
          dimensions: work.dimensions,
          year: work.year,
          image: primaryImageUrl(work),
          artistName: t.site.artist,
        })}
      />
      <ArtworkStage
        lang={lang}
        src={primaryImageUrl(work)}
        alt={artworkSeo(work, lang).imageAlt}
        title={work.title}
        priority
        prev={neighbours.prev}
        next={neighbours.next}
      >
        {/* На телефоне эта ссылка спрятана: там она стоит в одном ряду
            со стрелками (ArtworkStage), иначе выходили две строки
            навигации подряд. */}
        <Link
          href={localePath(lang, "/gallery")}
          className="text-ink-soft hover:text-ink mb-4 hidden text-[14px] no-underline hover:underline lg:inline-block"
        >
          {t.work.backToAll}
        </Link>

        <span className="text-accent mb-2.5 block text-[13px] font-semibold tracking-[0.12em] uppercase">
          {artworkCategory(work.category, lang) ?? t.work.fallbackKicker}
        </span>

        {/* Тень под заголовком, а не плашка: в тёмном зале подпись лежит
            на размытой копии картины, и у светлой работы фон светлеет —
            без тени тонкие засечки Literata сливались с ним. В светлых
            залах тень снимается (класс stage-title в globals.css). */}
        <h1 className="stage-title text-ink mt-0 mb-3 text-[clamp(32px,5vw,64px)]">{work.title}</h1>

        {meta && <p className="text-ink-soft mt-0 mb-4 text-[14px]">{meta}</p>}

        {description && (
          <p className="text-ink-soft mt-0 mb-4 max-w-[46ch] text-[16px] leading-relaxed">
            {description}
          </p>
        )}

        <div className="btn-row">
          {/*
            Кнопка WhatsApp появляется только когда номер заполнен
            в переменных окружения. Кнопка с выдуманным телефоном хуже,
            чем её отсутствие: человек нажмёт и попадёт в пустоту.
          */}
          {phone && (
            <ExternalButtonLink
              variant="primary"
              size="lg"
              href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.work.write}
            </ExternalButtonLink>
          )}

          {/*
            Примерка — одна кнопка, хотя режима два: стена с рамой (/room)
            и камера телефона (/ar). Две кнопки рядом заставляли выбирать
            ещё до того, как человек понял, что это такое (заказчик,
            8.10.2026). Внутри режимы переключаются наверху.

            Куда ведёт кнопка, решает тип экрана: с пальца — в камеру, с мыши —
            на стену, на компьютере камеры нет. Это две ссылки, и одна из них
            скрыта CSS (pointer: coarse), а не одна ссылка с адресом из скрипта:
            так адрес верный с первой отрисовки, без подмены после загрузки.
            iPad считается сенсорным — и это верно, камера на нём есть.
            Работу нельзя показать в камере (lib/ar.ts, cameraTarget) —
            кнопка везде ведёт на стену. Без фотографии кнопки нет.
          */}
          {primaryImageUrl(work) && (
            <>
              <ButtonLink
                href={localePath(lang, `/gallery/${work.id}/room`)}
                variant="soft"
                size="lg"
                className={cameraTarget(work) === null ? undefined : "pointer-coarse:hidden"}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="1.5" />
                  <rect x="7" y="7" width="10" height="10" />
                </svg>
                {t.work.tryOnWall}
              </ButtonLink>
              {cameraTarget(work) !== null && (
                <ButtonLink
                  href={localePath(lang, `/gallery/${work.id}/ar`)}
                  variant="soft"
                  size="lg"
                  className="hidden pointer-coarse:inline-flex"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="1.5" />
                    <rect x="7" y="7" width="10" height="10" />
                  </svg>
                  {t.work.tryOnWall}
                </ButtonLink>
              )}
            </>
          )}

          {/* Приглушённая вместо `secondary`: она берёт цвет от текста темы
              и потому читается в любом зале. Только с настоящей почтой из
              окружения: прежде кнопка вела на заглушку из lib/site.ts,
              hello@berlant-art.example, — письмо ушло бы в пустоту. */}
          {contactEmail && (
            <ExternalButtonLink
              variant={phone ? "soft" : "primary"}
              size="lg"
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(message)}`}
            >
              {t.work.writeEmail}
            </ExternalButtonLink>
          )}
        </div>

        {/* Без подсказки кнопка, открывающая мессенджер, а не форму на сайте,
            застала бы врасплох. */}
        {phone && (
          <p className="text-ink-faint mt-2.5 mb-0 text-[13px]">
            {t.work.whatsappHint(t.work.write)}
          </p>
        )}

        {/* Картина закрывает экран целиком, и без подсказки не видно, что ниже
            есть ещё содержимое. Ссылка, а не рисованная стрелка: она работает
            с клавиатуры и читается скринридером. */}
        {hasMore && (
          <a
            href="#more"
            className="text-accent mt-5 inline-block text-[14px] font-semibold no-underline hover:underline"
          >
            {t.work.seeMore}
          </a>
        )}
      </ArtworkStage>

      <main id="more">
        {extraImages.length > 0 && (
          <Container>
            <section className="pt-12 pb-4">
              <h2 className="mt-0 mb-5 text-[22px]">{t.work.otherAngles}</h2>
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3">
                {extraImages.map((image) => (
                  <li key={image.id} className="bg-surface relative aspect-square overflow-hidden">
                    <ArtworkImage
                      src={imageUrl(image.url)}
                      alt={image.alt}
                      fit="contain"
                      sizes="(max-width: 767px) 50vw, 380px"
                    />
                  </li>
                ))}
              </ul>
            </section>
          </Container>
        )}

        {others.length > 0 && (
          /* Секция во всю ширину, а не класс .bleed: тот задан шириной 100vw,
             а она включает полосу прокрутки — на этой странице документ
             вылезал за окно на 8px (1433px при окне 1425px). Так же сделаны
             полосы на главной и /about. */
          <div className="bg-wall w-full pt-14 pb-16">
            <Container>
              <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-ink m-0 text-[26px]">{t.work.otherWorks}</h2>
                <Link
                  href={localePath(lang, "/gallery")}
                  className="text-accent font-semibold no-underline hover:underline"
                >
                  {t.work.allGallery}
                </Link>
              </div>

              {/* Ровный ряд, без неровных пролётов коллажа: здесь это
                  дополнение к карточке, а не главная витрина. */}
              <ul className="wall m-0 grid list-none auto-rows-[190px] grid-cols-2 gap-5 p-0 md:grid-cols-4">
                {others.map((other) => (
                  <ArtworkTile key={other.id} work={other} lang={lang} />
                ))}
              </ul>
            </Container>
          </div>
        )}
      </main>
    </>
  );
}
