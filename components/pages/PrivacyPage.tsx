import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Container } from "@/components/ui/Container";
import { contactList } from "@/lib/contacts";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

/**
 * Политика конфиденциальности (решение заказчика 3 октября 2026).
 *
 * Текст описывает то, как сайт устроен на самом деле, а не типовой шаблон:
 * сервер не получает и не хранит ничего из того, что пишет посетитель
 * (ContactForm и кнопка «Купить» только открывают WhatsApp или почту),
 * аналитики и рекламных куки нет, шрифты отдаются с нашего домена.
 * Поменялось устройство — например, появилась Яндекс Метрика или форма
 * с отправкой на сервер, — текст обязан поменяться вместе с ним, и тогда
 * понадобятся согласие на обработку данных и уведомление о куки.
 *
 * Обязательства художницы (для чего используются сообщения, кому не
 * передаются) записаны с её слов через заказчика; юридическую формулировку
 * стоит показать юристу.
 */
export function PrivacyPage({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const p = t.privacy;
  const contacts = contactList(t.contacts).filter((contact) => contact.id !== "phone");

  return (
    <>
      <Header />

      <main>
        <Container>
          <article className="max-w-[68ch] pt-14 pb-20 min-[900px]:pt-20">
            <span className="text-accent mb-4 block text-[13px] font-semibold tracking-[0.1em] uppercase">
              {p.kicker}
            </span>
            <h1 className="mt-0 mb-3 text-[clamp(34px,5vw,56px)] leading-[1.05]">{p.title}</h1>
            <p className="text-ink-faint mt-0 mb-10 text-[14px]">{p.revised}</p>

            <div className="legal">
              <h2>{p.shortTitle}</h2>
              <p>{p.short}</p>

              <h2>{p.whoTitle}</h2>
              <p>{p.who(t.site.artist, t.site.location)}</p>
              <ul>
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    {contact.label}:{" "}
                    <a
                      href={contact.href}
                      {...(contact.isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {contact.value}
                    </a>
                  </li>
                ))}
              </ul>

              <h2>{p.receivesTitle}</h2>
              {p.receives.map((text) => (
                <p key={text}>{text}</p>
              ))}

              <h2>{p.cookiesTitle}</h2>
              {p.cookies.map((text) => (
                <p key={text}>{text}</p>
              ))}

              <h2>{p.logsTitle}</h2>
              <p>{p.logs}</p>

              <h2>{p.imagesTitle}</h2>
              <p>{p.images}</p>

              <h2>{p.pricesTitle}</h2>
              <p>{p.prices}</p>

              <h2>{p.changesTitle}</h2>
              <p>
                {p.changes}
                <Link href={localePath(lang, "/contact")}>{p.changesLink}</Link>.
              </p>
            </div>
          </article>
        </Container>
      </main>
    </>
  );
}
