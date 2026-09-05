import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Header } from "@/components/layout/Header";
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
  getArtworks,
  getOtherArtworks,
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
      work.description ?? [artworkCaption(work), "Живопись Берлан Джабраиловой."].join(" · "),
  };
}

/**
 * Страница одной работы. По ней человек решает, покупать ли картину, —
 * поэтому пустые поля здесь не показываются вовсе: «Размер: не указан»
 * на карточке товара читается как небрежность, а не как честность.
 *
 * Макета у страницы нет, она собрана из приёмов галереи: светлая шапка
 * раздела, крупная репродукция, тёмная полоса с другими работами внизу.
 */
export default async function ArtworkPage({ params }: PageProps<"/gallery/[id]">) {
  const { id } = await params;

  // Запросы не зависят друг от друга, поэтому идут разом, а не по очереди.
  const [work, others] = await Promise.all([getArtworkById(id), getOtherArtworks(id)]);

  if (!work) notFound();

  const label = artworkStatusLabel(work.status);
  const price = formatPrice(work.price);
  const extraImages = work.images.slice(1);

  // Незаполненное поле не превращается в прочерк, а исчезает целиком.
  const attributes: Array<{ label: string; value: string }> = [];
  if (work.technique) attributes.push({ label: "Техника", value: work.technique });
  if (work.dimensions) attributes.push({ label: "Размеры", value: work.dimensions });
  if (work.year) attributes.push({ label: "Год", value: String(work.year) });
  if (work.category) attributes.push({ label: "Сюжет", value: work.category });

  // В сообщение подставляется ссылка на саму работу: художница сразу видит,
  // о какой картине речь, и ей не нужно переспрашивать.
  const pageUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/gallery/${work.id}`;
  const message = `Здравствуйте! Интересует работа «${work.title}». ${pageUrl}`;
  const phone = clientEnv.NEXT_PUBLIC_WHATSAPP_PHONE;
  const mailSubject = `Работа «${work.title}»`;

  return (
    <>
      <Header />

      <main>
        <Container>
          <div className="pt-10 pb-5">
            <Link href="/gallery" className="text-ink/60 text-[13px] no-underline hover:underline">
              ← Все работы
            </Link>
          </div>

          <article className="grid gap-10 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              {/*
                Квадратная рамка с полями вместо кадрирования: холсты бывают
                и вертикальные (335×597), и горизонтальные (490×408), а
                срезать край картины на её собственной странице нельзя.
                Фильтр .washed здесь тоже не нужен — в галерее он гасит
                репродукции, чтобы они не спорили с охрой интерфейса, но
                покупатель должен видеть настоящий цвет живописи.
              */}
              <div className="bg-surface rounded-panel elev-md relative aspect-square overflow-hidden">
                <ArtworkImage
                  src={primaryImageUrl(work)}
                  alt={work.title}
                  fit="contain"
                  priority
                  sizes="(max-width: 1023px) 100vw, 600px"
                />
              </div>

              {extraImages.length > 0 && (
                <ul className="m-0 mt-4 grid list-none grid-cols-3 gap-3 p-0">
                  {extraImages.map((image) => (
                    <li
                      key={image.id}
                      className="bg-surface rounded-tile relative aspect-square overflow-hidden"
                    >
                      <ArtworkImage
                        src={image.url}
                        alt={image.alt}
                        fit="contain"
                        sizes="(max-width: 1023px) 30vw, 190px"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="lg:pt-2">
              <span className="text-accent-700 mb-3 block text-[13px] font-semibold tracking-[0.08em] uppercase">
                Работа
              </span>

              <h1 className="mt-0 mb-3 text-[clamp(28px,3.6vw,40px)]">{work.title}</h1>

              {label && (
                <Tag tone={work.status === "SOLD" ? "neutral" : "accent"} className="mb-5">
                  {label}
                </Tag>
              )}

              {work.description && (
                <p className="text-ink/80 mt-0 mb-6 max-w-[52ch] text-[15.5px] leading-relaxed">
                  {work.description}
                </p>
              )}

              {attributes.length > 0 && (
                <dl className="border-divider m-0 mb-6 border-t">
                  {attributes.map((attribute) => (
                    <div
                      key={attribute.label}
                      className="border-divider flex justify-between gap-6 border-b py-2.5"
                    >
                      <dt className="text-ink/55 m-0 text-[13.5px]">{attribute.label}</dt>
                      <dd className="m-0 text-right text-[13.5px]">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {price && <p className="font-heading mt-0 mb-6 text-[26px]">{price}</p>}

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

                <ExternalButtonLink
                  variant={phone ? "secondary" : "primary"}
                  size="lg"
                  href={`mailto:${site.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(message)}`}
                >
                  Написать на почту
                </ExternalButtonLink>
              </div>

              <p className="text-ink/55 mt-4 mb-0 max-w-[46ch] text-[13px]">
                Каждая работа существует в единственном экземпляре. О цене, доставке и сроках —
                напрямую с художницей.
              </p>
            </div>
          </article>
        </Container>

        {others.length > 0 && (
          <div className="bleed bg-neutral-900 pt-14 pb-16">
            <Container>
              <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="m-0 text-[26px] text-neutral-100">Другие работы</h2>
                <Link
                  href="/gallery"
                  className="text-accent-300 font-semibold no-underline hover:underline"
                >
                  Вся галерея →
                </Link>
              </div>

              {/* Та же стена, что в галерее, но без неровных пролётов: здесь
                  это дополнение к карточке, а не главная витрина. */}
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
