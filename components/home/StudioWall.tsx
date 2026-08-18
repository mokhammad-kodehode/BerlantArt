import Link from "next/link";

import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import type { DemoArtwork } from "@/lib/demo-artworks";

/**
 * Тёмная полоса «Из мастерской»: работы едут горизонтальной лентой, как на
 * стене мастерской. Скролл нативный со снапом — без библиотек каруселей и
 * без JS: на телефоне это привычный свайп, на десктопе — колесо с shift.
 */
export function StudioWall({ works }: { works: DemoArtwork[] }) {
  return (
    <div className="bleed overflow-hidden bg-neutral-900">
      {/* Тёплые пятна света по краям полосы. */}
      <div className="pointer-events-none absolute top-[-160px] left-[2%] size-[420px] rounded-full bg-[radial-gradient(circle,rgb(214_127_72/0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute right-[4%] bottom-[10%] size-[360px] rounded-full bg-[radial-gradient(circle,rgb(122_138_94/0.18),transparent_70%)]" />

      <Container className="relative pt-16 pb-18">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 text-[30px] text-neutral-100">Из мастерской Берлан</h2>
          <Link
            href="/gallery"
            className="text-accent-300 font-semibold no-underline hover:underline"
          >
            Вся галерея →
          </Link>
        </div>

        <p className="mt-0 mb-9 max-w-[56ch] text-[14.5px] text-neutral-100/65">
          Горные пейзажи, сад и двор, тихие натюрморты — работы разных лет, как на стене мастерской.
        </p>

        <ul className="hide-scrollbar m-0 flex snap-x snap-proximity list-none gap-7 overflow-x-auto p-2 pb-10">
          {works.map((work) => (
            <li key={work.id} className="w-[210px] shrink-0 snap-start">
              <div className="rounded-2xl bg-neutral-800 p-2.5 shadow-[0_0_46px_rgb(214_127_72/0.28),0_18px_40px_rgb(0_0_0/0.45)]">
                <div className="washed relative aspect-3/4 overflow-hidden rounded-lg">
                  <ArtworkImage src={work.src} alt={work.title} sizes="210px" />
                </div>
              </div>
              <p className="mt-3.5 mb-0.5 text-[13px] tracking-[0.04em] text-neutral-100 uppercase">
                {work.title}
              </p>
              <p className="m-0 text-[11.5px] text-neutral-100/55">
                {work.medium} · {work.size}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <Tag className="bg-accent-300/20 text-accent-300">С 2020 года в живописи</Tag>
          <Tag className="bg-accent-2-300/25 text-accent-2-300">Начала в 55 лет</Tag>
        </div>
      </Container>
    </div>
  );
}
