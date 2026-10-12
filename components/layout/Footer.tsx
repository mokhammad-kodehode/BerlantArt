import Link from "next/link";

import { ContactIcon } from "@/components/ui/ContactIcon";
import { Container } from "@/components/ui/Container";
import { contactList } from "@/lib/contacts";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import { footerSections } from "@/lib/site";

/**
 * Подвал одинаков на всех страницах, поэтому подключён в корневом layout.
 *
 * Внешнего отступа сверху нет: отступ до подвала задаёт сама страница.
 * Прежний mt-4 оставлял полосу фона между подвалом и блоком во весь экран —
 * видео в конце главной, стеной галереи.
 */
export function Footer({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);

  return (
    <footer className="bg-wall text-ink">
      <Container className="flex flex-wrap justify-between gap-10 pt-14 pb-10">
        <div className="max-w-[32ch]">
          <div className="font-heading mb-2 text-xl">{t.site.artist}</div>
          <p className="text-ink-faint m-0 text-[14px] leading-relaxed">{t.site.description}</p>
          <p className="font-heading text-accent mt-4 mb-0 text-[16px]">{t.site.slogan}</p>
        </div>

        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="text-accent mb-0.5 text-[12px] tracking-[0.08em] uppercase">
              {t.footer.sections}
            </span>
            {footerSections.map((item) => (
              <Link
                key={item.href}
                href={localePath(lang, item.href)}
                className="text-accent no-underline hover:underline"
              >
                {t.nav[item.key]}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <span className="text-accent mb-0.5 text-[12px] tracking-[0.08em] uppercase">
              {t.footer.contacts}
            </span>
            {/* Только настроенные контакты (lib/contacts.ts). Прежде здесь
                стояла почта-заглушка hello@berlant-art.example — выдуманный
                адрес, по которому письмо ушло бы в пустоту.
                Телефона здесь нет: это тот же номер, что у WhatsApp строкой
                выше, и в узкой колонке он читался бы как повтор. Позвонить
                можно со страницы контактов. */}
            {contactList(t.contacts)
              .filter((contact) => contact.id !== "phone")
              .map((contact) => (
                <a
                  key={contact.id}
                  href={contact.href}
                  {...(contact.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="text-accent inline-flex items-center gap-2 no-underline hover:underline"
                >
                  <ContactIcon id={contact.id} className="size-[18px] shrink-0" />
                  <span>
                    <span className="sr-only">{contact.label}: </span>
                    {contact.value}
                  </span>
                </a>
              ))}
            <span className="text-ink-faint">{t.site.location}</span>
            <Link
              href={localePath(lang, "/contact")}
              className="text-accent no-underline hover:underline"
            >
              {t.footer.write}
            </Link>
          </div>
        </div>
      </Container>

      {/* Права на изображения — здесь, а не только в политике: подвал
          видят на каждой странице, а копируют картины обычно отсюда же. */}
      <Container className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-8">
        <p className="text-ink-faint m-0 text-xs">
          {t.footer.rights(new Date().getFullYear(), t.site.artist)}
        </p>
        <Link
          href={localePath(lang, "/privacy")}
          className="text-ink-faint hover:text-ink text-xs underline"
        >
          {t.footer.privacy}
        </Link>
      </Container>
    </footer>
  );
}
