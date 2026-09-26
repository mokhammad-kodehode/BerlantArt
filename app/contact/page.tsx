import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ContactForm } from "@/components/contact/ContactForm";
import { Header } from "@/components/layout/Header";
import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { ExternalButtonLink } from "@/components/ui/Button";
import { ContactIcon } from "@/components/ui/ContactIcon";
import { Container } from "@/components/ui/Container";
import { getFeatured, primaryImageUrl } from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { contactEmail, contactList, whatsappPhone } from "@/lib/contacts";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Как связаться с Берлант Джабраиловой: WhatsApp, телефон, Instagram. Покупка и заказ картин.",
};

/**
 * Как у главной: страница готовится заранее и обновляется раз в пять минут.
 * Запрос в базу здесь один — картина, «приколотая» к фотографии, — и уснувшая
 * база не должна ронять страницу, по которой художнице пишут.
 */
export const revalidate = 300;

/**
 * Контакты. Основа — design/mockups/Contact.dc.html, отступления записаны
 * в ARCHITECTURE.md:
 * — вместо панели с тремя строками — крупные карточки на каждый способ
 *   связи: по просьбе заказчика, «современно и творчески»; главный способ,
 *   WhatsApp, ещё и кнопкой на первом экране;
 * — рядом с заголовком фотография художницы с картиной поверх угла:
 *   страница о живом человеке, а не бланк заявки;
 * — в форме нет полей почты и телефона посетителя (см. ContactForm).
 *
 * Карточки строятся из contactList(): незаполненный контакт — Telegram,
 * Facebook, почта, пока их нет, — не рисуется вовсе.
 */
export default async function ContactPage() {
  const [pinned] = await getFeatured(1);
  const contacts = contactList();
  const whatsapp = contacts.find((contact) => contact.id === "whatsapp");
  const phone = contacts.find((contact) => contact.id === "phone");

  return (
    <>
      <Header />

      <main>
        <Container>
          {/*
            Первый экран: слева заголовок и два главных действия, справа
            фотография. Ниже 900px — одна колонка, фото под текстом: на
            телефоне сначала нужно действие, а не картинка.
          */}
          <section className="grid grid-cols-1 items-center gap-14 pt-14 pb-20 min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] min-[900px]:pt-20">
            <div>
              <span className="text-accent mb-4 block text-[13px] font-semibold tracking-[0.1em] uppercase">
                Контакты
              </span>
              <h1 className="mt-0 mb-5 text-[clamp(36px,5.5vw,64px)] leading-[1.05]">
                Заказать картину
              </h1>
              <p className="text-ink/80 mt-0 mb-8 max-w-[44ch] text-[17px] leading-relaxed">
                Купить готовую работу, заказать картину или просто задать вопрос — напишите или
                позвоните так, как вам удобно.
              </p>

              <div className="flex flex-wrap gap-3">
                {whatsapp && (
                  <ExternalButtonLink
                    href={whatsapp.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="primary"
                    size="lg"
                  >
                    <ContactIcon id="whatsapp" className="size-5" />
                    Написать в WhatsApp
                  </ExternalButtonLink>
                )}
                {phone && (
                  <ExternalButtonLink href={phone.href} variant="secondary" size="lg">
                    <ContactIcon id="phone" className="size-5" />
                    {phone.value}
                  </ExternalButtonLink>
                )}
              </div>
            </div>

            {/*
              Фотография и картина поверх её угла, чуть наискось — как
              карточка, заткнутая за раму. Поле у картины цвета фона
              страницы: без него холст сливался бы с тёмным углом снимка.

              Портрет временный — см. комментарий на /about: сгенерирован
              по кадру из репортажа, будет заменён настоящим снимком.
              Правый отступ под картину нужен, чтобы её угол не упирался
              в край экрана на телефоне.
            */}
            <div className="relative mx-auto w-full max-w-[460px] pb-10 pl-10 min-[900px]:mr-0">
              <figure className="rounded-panel relative m-0 aspect-3/4 overflow-hidden">
                <Image
                  src="/about/berlant-u-molberta.webp"
                  alt="Берлант Джабраилова у мольберта"
                  fill
                  sizes="(min-width: 900px) 420px, 90vw"
                  className="object-cover"
                  priority
                />
              </figure>

              {pinned && (
                <Link
                  href={`/gallery/${pinned.id}`}
                  className="rounded-tile border-bg absolute bottom-0 left-0 block aspect-square w-[46%] -rotate-3 overflow-hidden border-[6px] shadow-[var(--shadow-lg)] transition-transform duration-300 hover:rotate-0 focus-visible:outline-offset-4"
                >
                  <ArtworkImage
                    src={primaryImageUrl(pinned)}
                    alt={pinned.title}
                    sizes="(min-width: 900px) 200px, 42vw"
                  />
                </Link>
              )}
            </div>
          </section>

          {/*
            Карточка на каждый способ связи, вся — одна ссылка. Раскладка
            flex-wrap с основой 240px, а не сетка с жёстким числом столбцов:
            сколько контактов настроено, заранее неизвестно (от трёх до
            шести), и в сетке неполная строка оставляла бы пустые клетки.
            Здесь последняя строка просто растягивается на всю ширину.
          */}
          <section aria-labelledby="channels-title" className="pb-20">
            <h2 id="channels-title" className="mt-0 mb-6 text-[clamp(26px,3vw,34px)]">
              Способы связи
            </h2>

            <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
              {contacts.map((contact) => {
                // WhatsApp — главный способ связи, его карточка контрастная:
                // фон и текст — как у главной кнопки.
                const isMain = contact.id === "whatsapp";

                return (
                  <li key={contact.id} className="flex flex-[1_1_240px]">
                    <a
                      href={contact.href}
                      {...(contact.isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={cn(
                        "group rounded-card flex w-full flex-col gap-8 p-7 no-underline transition-transform duration-300 hover:-translate-y-1",
                        isMain ? "bg-btn text-btn-ink" : "bg-surface text-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-12 items-center justify-center rounded-full border",
                          isMain ? "border-btn-ink/30" : "border-ink/15",
                        )}
                      >
                        <ContactIcon id={contact.id} className="size-6" />
                      </span>

                      <span className="mt-auto block">
                        <span
                          className={cn(
                            "mb-1.5 block text-[13px] font-semibold tracking-[0.08em] uppercase",
                            isMain ? "text-btn-ink/75" : "text-accent",
                          )}
                        >
                          {contact.label}
                        </span>
                        <span className="font-heading block text-[clamp(20px,2vw,24px)] break-words">
                          {contact.value}
                        </span>
                        <span
                          className={cn(
                            "mt-4 inline-block text-[15px] font-medium",
                            isMain ? "text-btn-ink/85" : "text-ink/75",
                          )}
                        >
                          {contact.action}{" "}
                          <span
                            aria-hidden="true"
                            className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          {/*
            Форма и девиз рядом. Формы нет, если не настроены ни WhatsApp,
            ни почта: отправить собранный текст было бы некуда.
          */}
          {(whatsappPhone !== undefined || contactEmail !== undefined) && (
            <section
              aria-labelledby="form-title"
              className="grid grid-cols-1 gap-10 pb-24 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] min-[900px]:gap-16"
            >
              <div className="rounded-panel bg-surface p-[clamp(24px,4vw,44px)]">
                <h2 id="form-title" className="mt-0 mb-2 text-[clamp(24px,2.6vw,30px)]">
                  Написать сообщение
                </h2>
                <p className="text-ink/75 mt-0 mb-7 text-[15px] leading-relaxed">
                  Заполните — и сообщение откроется готовым, останется только отправить.
                </p>
                <ContactForm whatsappPhone={whatsappPhone} email={contactEmail} />
              </div>

              <div className="flex flex-col justify-between gap-10 py-2">
                <p className="font-heading text-accent m-0 text-[clamp(34px,4.4vw,56px)] leading-[1.1]">
                  {site.slogan}
                </p>
                <div>
                  <span className="text-accent mb-1.5 block text-[13px] font-semibold tracking-[0.08em] uppercase">
                    Мастерская
                  </span>
                  <p className="text-ink m-0 text-[17px]">{site.location}</p>
                </div>
              </div>
            </section>
          )}
        </Container>
      </main>
    </>
  );
}
