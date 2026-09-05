import type { Metadata } from "next";

import { Header } from "@/components/layout/Header";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

/**
 * 404 — и для несуществующих адресов, и для вызовов notFound() со страницы
 * работы, когда картины с таким адресом в базе нет.
 *
 * Причина названа честно: чаще всего сюда попадают по старой ссылке
 * на работу, которую сняли с сайта.
 */
export default function NotFoundPage() {
  return (
    <>
      <Header />

      <main>
        <Container>
          <section className="panel-dashed my-16 p-10 md:my-24 md:p-14">
            <p className="text-ink/55 mt-0 mb-3 text-[13px] tracking-[0.14em] uppercase">
              Ошибка 404
            </p>

            <h1 className="mt-0 mb-4 text-[clamp(26px,4vw,34px)]">Такой страницы нет</h1>

            <p className="text-ink/75 mt-0 mb-8 max-w-[52ch] text-[16px] leading-relaxed">
              Возможно, в адресе опечатка — или работа, на которую вела ссылка, больше не
              выставлена.
            </p>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/gallery" variant="primary">
                Смотреть работы
              </ButtonLink>
              <ButtonLink href="/" variant="ghost">
                На главную
              </ButtonLink>
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
