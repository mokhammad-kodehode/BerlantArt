import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { footerSections, site } from "@/lib/site";

/**
 * Подвал одинаков на всех страницах, поэтому подключён в корневом layout.
 *
 * Внешнего отступа сверху нет: отступ до подвала задаёт сама страница.
 * Прежний mt-4 оставлял полосу фона между подвалом и блоком во весь экран —
 * видео в конце главной, стеной галереи.
 */
export function Footer() {
  return (
    <footer className="bg-wall text-ink">
      <Container className="flex flex-wrap justify-between gap-10 pt-14 pb-10">
        <div className="max-w-[32ch]">
          <div className="font-heading mb-2 text-xl">{site.artist}</div>
          <p className="text-ink/65 m-0 text-[14px] leading-relaxed">{site.description}</p>
          <p className="font-heading text-accent mt-4 mb-0 text-[16px]">{site.slogan}</p>
        </div>

        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="text-accent mb-0.5 text-[12px] tracking-[0.08em] uppercase">
              Разделы
            </span>
            {footerSections.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-accent no-underline hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <span className="text-accent mb-0.5 text-[12px] tracking-[0.08em] uppercase">
              Контакты
            </span>
            <a href={`mailto:${site.email}`} className="text-accent no-underline hover:underline">
              {site.email}
            </a>
            <a
              href={site.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              Instagram @{site.instagram.handle}
            </a>
            <span className="text-ink/65">{site.location}</span>
            <Link href="/contact" className="text-accent no-underline hover:underline">
              Написать →
            </Link>
          </div>
        </div>
      </Container>

      <Container className="pb-8">
        <p className="text-ink/50 m-0 text-xs">
          © {new Date().getFullYear()} {site.artist}
        </p>
      </Container>
    </footer>
  );
}
