import { Header } from "@/components/layout/Header";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

/**
 * 404 — и для несуществующих адресов, и для вызовов notFound() со страницы
 * работы, когда картины с таким адресом в базе нет.
 *
 * Причина названа честно: чаще всего сюда попадают по старой ссылке
 * на работу, которую сняли с сайта.
 */
export function NotFoundPage({
  lang,
  englishHint = false,
}: {
  lang: Locale;
  /** Строка по-английски — для общей 404, где язык адреса неизвестен. */
  englishHint?: boolean;
}) {
  const t = getDictionary(lang).notFound;

  return (
    <>
      <Header />

      <main>
        <Container>
          <section className="panel-dashed my-16 p-10 md:my-24 md:p-14">
            <p className="text-ink-faint mt-0 mb-3 text-[14px] tracking-[0.14em] uppercase">
              {t.code}
            </p>

            <h1 className="mt-0 mb-4 text-[clamp(26px,4vw,34px)]">{t.heading}</h1>

            <p className="text-ink-soft mt-0 mb-8 max-w-[52ch] text-[16px] leading-relaxed">
              {t.text}
            </p>

            {englishHint && (
              <p lang="en" className="text-ink-faint mt-0 mb-8 max-w-[52ch] text-[14px]">
                {getDictionary("en").notFound.heading}.{" "}
                <a href={localePath("en", "/")}>{getDictionary("en").notFound.toHome} →</a>
              </p>
            )}

            <div className="btn-row">
              <ButtonLink href={localePath(lang, "/gallery")} variant="primary">
                {t.toGallery}
              </ButtonLink>
              <ButtonLink href={localePath(lang, "/")} variant="ghost">
                {t.toHome}
              </ButtonLink>
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
