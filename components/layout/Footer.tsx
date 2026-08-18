import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { footerSections, site } from "@/lib/site";

/** Подвал одинаков на всех страницах, поэтому подключён в корневом layout. */
export function Footer() {
  return (
    <footer className="mt-4 bg-neutral-900 text-neutral-100">
      <Container className="flex flex-wrap justify-between gap-10 pt-14 pb-10">
        <div className="max-w-[32ch]">
          <div className="font-heading mb-2 text-xl">{site.artist}</div>
          <p className="m-0 text-[13px] leading-relaxed text-neutral-100/65">{site.description}</p>
          <p className="font-heading text-accent-300 mt-4 mb-0 text-[15px]">{site.slogan}</p>
        </div>

        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="text-accent-300 mb-0.5 text-[11px] tracking-[0.08em] uppercase">
              Разделы
            </span>
            {footerSections.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-accent-300 no-underline hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <span className="text-accent-300 mb-0.5 text-[11px] tracking-[0.08em] uppercase">
              Контакты
            </span>
            <a
              href={`mailto:${site.email}`}
              className="text-accent-300 no-underline hover:underline"
            >
              {site.email}
            </a>
            <a
              href={site.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-300 no-underline hover:underline"
            >
              Instagram @{site.instagram.handle}
            </a>
            <span className="text-neutral-100/65">{site.location}</span>
            <Link href="/contact" className="text-accent-300 no-underline hover:underline">
              Написать →
            </Link>
          </div>
        </div>
      </Container>

      <Container className="pb-8">
        <p className="m-0 text-xs text-neutral-100/50">
          © {new Date().getFullYear()} {site.artist}
        </p>
      </Container>
    </footer>
  );
}
