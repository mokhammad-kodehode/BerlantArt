"use client";

import { useEffect } from "react";

import { Header } from "@/components/layout/Header";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/**
 * Страница на случай падения.
 *
 * Клиентский компонент — это требование Next, а не наш выбор: чтобы
 * предложить повторить попытку, страница должна пережить ошибку в браузере.
 *
 * Хедер подключается здесь же: страница ошибки рендерится вместо обычной,
 * а хедер у нас живёт на страницах, а не в общем каркасе, — без него
 * отсюда некуда уйти.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // В проде текст ошибки до браузера не долетает — Next отдаёт только
    // digest. В разработке эта строка показывает настоящую причину.
    console.error(error);
  }, [error]);

  return (
    <>
      <Header />

      <main>
        <Container>
          <section className="panel-dashed my-16 p-10 md:my-24 md:p-14">
            <h1 className="mt-0 mb-4 text-[clamp(26px,4vw,34px)]">Страница не открылась</h1>

            <p className="text-ink/75 mt-0 mb-8 max-w-[52ch] text-[16px] leading-relaxed">
              Что-то пошло не так на нашей стороне. Чаще всего помогает повторная попытка — данные
              могли не успеть ответить.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={reset}>
                Попробовать снова
              </Button>
              <ButtonLink href="/" variant="ghost">
                На главную
              </ButtonLink>
            </div>

            {/*
              Код ошибки — единственная зацепка, по которой можно найти
              конкретное падение в логах. Показываем, чтобы человек мог
              назвать его, когда напишет.
            */}
            {error.digest && (
              <p className="text-ink/55 mt-8 mb-0 text-[13px]">
                Код ошибки: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </section>
        </Container>
      </main>
    </>
  );
}
