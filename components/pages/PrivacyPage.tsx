import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Container } from "@/components/ui/Container";
import { contactEmail, contactList } from "@/lib/contacts";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

/**
 * Политика конфиденциальности — политика обработки персональных данных
 * по 152-ФЗ (ст. 18.1): оператор, данные, цели и основания, сроки,
 * передача за границу, права человека и срок ответа.
 *
 * Текст описывает то, как сайт устроен на самом деле, а не типовой шаблон:
 * сервер не получает и не хранит ничего из того, что пишет посетитель
 * (ContactForm и кнопка «Купить» только открывают WhatsApp или почту),
 * аналитики и рекламных куки нет, шрифты отдаются с нашего домена.
 * Поменялось устройство — например, появилась Яндекс Метрика или форма
 * с отправкой на сервер, — текст обязан поменяться вместе с ним, и тогда
 * понадобятся согласие на обработку данных (отдельным документом, с 1
 * сентября 2025) и уведомление о куки.
 *
 * Оператор — частное лицо (8.10.2026): у художницы пока нет ни ИП, ни
 * самозанятости. Появится статус — дописать его и ИНН в `privacy.operator`.
 * Почта для запросов — та же, что на сайте (NEXT_PUBLIC_CONTACT_EMAIL):
 * сменится в окружении — сменится и здесь. Текст стоит показать юристу.
 */
export function PrivacyPage({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const p = t.privacy;
  const contacts = contactList(t.contacts).filter((contact) => contact.id !== "phone");

  // Метки в тексте словаря: {operator}, {city}, {email}.
  const fill = (text: string) =>
    text
      .replaceAll("{operator}", p.operator)
      .replaceAll("{city}", p.city)
      .replaceAll("{email}", contactEmail ?? p.noEmail);

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
              {p.sections.map((section) => (
                <section key={section.title} className="contents">
                  <h2>{section.title}</h2>
                  {section.paragraphs.map((text) => (
                    <p key={text}>{fill(text)}</p>
                  ))}

                  {section.withContacts && (
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
                  )}

                  {section.list && (
                    <ul>
                      {section.list.map((item) => (
                        <li key={item}>{fill(item)}</li>
                      ))}
                    </ul>
                  )}

                  {section.after?.map((text) => (
                    <p key={text}>{fill(text)}</p>
                  ))}

                  {section.contactLink && (
                    <p>
                      <Link href={localePath(lang, "/contact")}>{section.contactLink}</Link>
                    </p>
                  )}
                </section>
              ))}
            </div>
          </article>
        </Container>
      </main>
    </>
  );
}
