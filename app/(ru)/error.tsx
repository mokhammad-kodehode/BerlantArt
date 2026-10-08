"use client";

import { useEffect } from "react";

import { Header } from "@/components/layout/Header";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localePath } from "@/lib/i18n/config";

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
  const t = useDictionary().error;
  const lang = useLocale();

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
            <h1 className="mt-0 mb-4 text-[clamp(26px,4vw,34px)]">{t.heading}</h1>

            <p className="text-ink-soft mt-0 mb-8 max-w-[52ch] text-[16px] leading-relaxed">
              {t.text}
            </p>

            <div className="btn-row">
              <Button variant="primary" onClick={reset}>
                {t.retry}
              </Button>
              <ButtonLink href={localePath(lang, "/")} variant="ghost">
                {t.toHome}
              </ButtonLink>
            </div>

            {/*
              Код ошибки — единственная зацепка, по которой можно найти
              конкретное падение в логах. Показываем, чтобы человек мог
              назвать его, когда напишет.
            */}
            {error.digest && (
              <p className="text-ink-faint mt-8 mb-0 text-[14px]">
                {t.code} <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </section>
        </Container>
      </main>
    </>
  );
}
