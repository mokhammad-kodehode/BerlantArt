import { Hero } from "@/components/home/Hero";
import { StudioWall } from "@/components/home/StudioWall";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import { demoArtworks } from "@/lib/demo-artworks";

/**
 * Главная. Собрана по макету design/mockups/Home.dc.html.
 *
 * Данные пока из lib/demo-artworks.ts — на этапе 3 их заменит выборка из
 * базы (getFeatured), разметка при этом не меняется.
 */
export default function HomePage() {
  return (
    <>
      <Hero slides={demoArtworks} />

      <StudioWall works={demoArtworks} />

      <main>
        <Container>
          {/* Тизер истории художницы — полная версия на /about */}
          <section className="pt-14 pb-12">
            <div className="rounded-panel bg-accent-2-100 px-[clamp(24px,5vw,72px)] py-14">
              <div className="max-w-[640px]">
                <h2 className="mt-0 mb-4 text-[28px]">От первого этюда — до узнаваемой манеры</h2>
                <p className="text-ink/80 mt-0 mb-6 text-[15.5px] leading-relaxed">
                  За несколько лет Берлан прошла путь от первых этюдов до признания дома, в
                  Чеченской Республике. Её тёплый колорит и внимание к свету делают работы
                  узнаваемыми с первого взгляда.
                </p>
                <ButtonLink href="/about" variant="secondary">
                  Читать историю →
                </ButtonLink>
              </div>
            </div>
          </section>

          {/* Выставки: пустое состояние, пока событий нет */}
          <section className="pb-18">
            <div className="panel-dashed flex flex-wrap items-center justify-between gap-5 p-10">
              <div>
                <Tag tone="outline">Выставки</Tag>
                <h3 className="mt-4 mb-2">Ближайшие события скоро появятся здесь</h3>
                <p className="text-ink/70 m-0 max-w-[48ch]">
                  Следите за расписанием выставок и показов работ Берлан.
                </p>
              </div>
              <ButtonLink href="/contact" variant="ghost">
                Написать художнице →
              </ButtonLink>
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
