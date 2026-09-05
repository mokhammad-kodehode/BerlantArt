import { Hero } from "@/components/home/Hero";
import { StudioWall } from "@/components/home/StudioWall";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Tag } from "@/components/ui/Tag";
import { getFeatured, primaryImageUrl } from "@/lib/artworks";

/**
 * Как часто страница перерисовывается заново, в секундах.
 *
 * Без этой строки главная стала бы динамической — запрос в базу на каждое
 * открытие. С ней она снова готовится заранее: посетитель получает готовый
 * HTML, а уснувшая база (бесплатный тариф Supabase засыпает через неделю
 * простоя) не роняет главную — отдаётся последняя удачная версия.
 *
 * Значение обязано быть числом-литералом: Next читает его при сборке,
 * и выражение вроде 60 * 5 он не разберёт.
 *
 * Плата — правка через админку появится с задержкой до пяти минут. На этапе 6
 * админка вызовет revalidatePath("/"), и задержка исчезнет.
 */
export const revalidate = 300;

/**
 * Главная. Собрана по макету design/mockups/Home.dc.html.
 *
 * Работы для первого экрана и для ленты — одна и та же выборка: запрос
 * в базу с этой страницы ровно один, и их число не растёт с числом картин.
 */
export default async function HomePage() {
  const featured = await getFeatured();

  return (
    <>
      {/*
        Hero клиентский, поэтому получает не работы целиком, а три поля,
        которые ему нужны: остальное просто уехало бы в браузер без пользы.
      */}
      <Hero
        slides={featured.map((work) => ({
          id: work.id,
          title: work.title,
          imageUrl: primaryImageUrl(work),
        }))}
      />

      <StudioWall works={featured} />

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
