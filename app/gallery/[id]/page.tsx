import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkStage } from "@/components/gallery/ArtworkStage";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { ArtworkTile } from "@/components/ui/ArtworkTile";
import { ExternalButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import {
  artworkCaption,
  artworkStatusLabel,
  formatPrice,
  getArtworkById,
  getArtworkNeighbours,
  getArtworks,
  getOtherArtworks,
  imageUrl,
  primaryImageUrl,
} from "@/lib/artworks";
import { clientEnv } from "@/lib/env";
import { site } from "@/lib/site";

/** Как на главной и в галерее: страница готовится заранее, а не при каждом заходе. */
export const revalidate = 300;

/**
 * Адреса всех работ известны на сборке — пять страниц готовятся заранее.
 *
 * `dynamicParams` намеренно оставлен по умолчанию (`true`): работа, которую
 * художница добавит через админку на этапе 6, отрисуется по первому запросу,
 * а не отдаст 404 до следующей сборки.
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const works = await getArtworks();
  return works.map((work) => ({ id: work.id }));
}

export async function generateMetadata({ params }: PageProps<"/gallery/[id]">): Promise<Metadata> {
  const { id } = await params;
  const work = await getArtworkById(id);

  // Запасной вариант, а не мёртвая ветка: без него `work.title` ниже
  // разыменовывает `null`. Увидеть этот заголовок нельзя — при отсутствии
  // работы страница отдаёт 404 и рисуется app/not-found.tsx со своим
  // заголовком; здесь он остаётся на случай, если над маршрутом когда-нибудь
  // снова появится заглушка загрузки и ответ пойдёт потоком.
  if (!work) {
    return { title: "Работа не найдена" };
  }

  return {
    title: work.title,
    // Описания нет пока ни у одной работы, поэтому запасной вариант собран
    // из того, что известно наверняка. Выдумывать сюжет и историю нельзя.
    description:
      work.description ?? [artworkCaption(work), "Живопись Берлант Джабраиловой."].join(" · "),
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
export default async function ArtworkPage({ params }: PageProps<"/gallery/[id]">) {
  const { id } = await params;

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [work, others, neighbours] = await Promise.all([
    getArtworkById(id),
    getOtherArtworks(id),
    getArtworkNeighbours(id),
  ]);

  if (!work) notFound();

  const label = artworkStatusLabel(work.status);
  const price = formatPrice(work.price);
  const extraImages = work.images.slice(1);

  // Незаполненное поле исчезает целиком, а не превращается в прочерк:
  // страница работы — карточка товара, врать в ней о габаритах нельзя.
  // Категории здесь нет намеренно — она уже стоит надстрочником над
  // названием, и в строке получалось «Холст, масло · Архитектурный мотив»
  // при надстрочнике «АРХИТЕКТУРНЫЙ МОТИВ».
  const meta = [work.year, work.technique, work.dimensions].filter(Boolean).join(" · ");

  // В сообщение подставляется ссылка на саму работу: художница сразу видит,
  // о какой картине речь, и ей не нужно переспрашивать.
  const pageUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/gallery/${work.id}`;
  const message = `Здравствуйте! Интересует работа «${work.title}». ${pageUrl}`;
  const phone = clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE;
  const mailSubject = `Работа «${work.title}»`;
  const hasMore = extraImages.length > 0 || others.length > 0;

  return (
    <>
      <ArtworkStage
        src={primaryImageUrl(work)}
        alt={work.title}
        priority
        prev={neighbours.prev}
        next={neighbours.next}
      >
        {/* На телефоне эта ссылка спрятана: там она стоит в одном ряду
            со стрелками (ArtworkStage), иначе выходили две строки
            навигации подряд. */}
        <Link
          href="/gallery"
          className="text-ink/70 hover:text-ink mb-4 hidden text-[14px] no-underline hover:underline lg:inline-block"
        >
          ← Все работы
        </Link>

        <span className="text-accent mb-2.5 block text-[13px] font-semibold tracking-[0.12em] uppercase">
          {work.category ?? "Работа"}
        </span>

        {/* Тень под заголовком, а не плашка: в тёмном зале подпись лежит
            на размытой копии картины, и у светлой работы фон светлеет —
            без тени тонкие засечки Literata сливались с ним. В светлых
            залах тень снимается (класс stage-title в globals.css). */}
        <h1 className="stage-title text-ink mt-0 mb-3 text-[clamp(32px,5vw,64px)]">{work.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          {label && <Tag tone={work.status === "SOLD" ? "neutral" : "accent"}>{label}</Tag>}
          {meta && <p className="text-ink/75 m-0 text-[14px]">{meta}</p>}
        </div>

        {work.description && (
          <p className="text-ink/85 mt-0 mb-4 max-w-[46ch] text-[16px] leading-relaxed">
            {work.description}
          </p>
        )}

        {price && <p className="font-heading text-ink mt-0 mb-4 text-[24px]">{price}</p>}

        <div className="flex flex-wrap gap-3">
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
              Написать в WhatsApp
            </ExternalButtonLink>
          )}

          {/* Приглушённая вместо `secondary`: она берёт цвет от текста темы
              и потому читается в любом зале. */}
          <ExternalButtonLink
            variant={phone ? "soft" : "primary"}
            size="lg"
            href={`mailto:${site.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(message)}`}
          >
            Написать на почту
          </ExternalButtonLink>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {/* Картина в тёмной комнате под лампой (/gallery/[id]/room).
              Без фотографии вешать на стену нечего — ссылки тогда нет. */}
          {primaryImageUrl(work) && (
            <Link
              href={`/gallery/${work.id}/room`}
              className="text-accent text-[14px] font-semibold no-underline hover:underline"
            >
              Посмотреть в интерьере →
            </Link>
          )}

          {/* Картина закрывает экран целиком, и без подсказки не видно, что ниже
              есть ещё содержимое. Ссылка, а не рисованная стрелка: она работает
              с клавиатуры и читается скринридером. */}
          {hasMore && (
            <a
              href="#more"
              className="text-accent text-[14px] font-semibold no-underline hover:underline"
            >
              Смотреть дальше ↓
            </a>
          )}
        </div>
      </ArtworkStage>

      <main id="more">
        {extraImages.length > 0 && (
          <Container>
            <section className="pt-12 pb-4">
              <h2 className="mt-0 mb-5 text-[22px]">Другие ракурсы</h2>
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3">
                {extraImages.map((image) => (
                  <li
                    key={image.id}
                    className="bg-surface rounded-tile relative aspect-square overflow-hidden"
                  >
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
                <h2 className="text-ink m-0 text-[26px]">Другие работы</h2>
                <Link
                  href="/gallery"
                  className="text-accent font-semibold no-underline hover:underline"
                >
                  Вся галерея →
                </Link>
              </div>

              {/* Ровный ряд, без неровных пролётов коллажа: здесь это
                  дополнение к карточке, а не главная витрина. */}
              <ul className="wall m-0 grid list-none auto-rows-[190px] grid-cols-2 gap-5 p-0 md:grid-cols-4">
                {others.map((other) => (
                  <ArtworkTile key={other.id} work={other} />
                ))}
              </ul>
            </Container>
          </div>
        )}
      </main>
    </>
  );
}
