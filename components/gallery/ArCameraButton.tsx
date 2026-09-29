"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { noCameraHash, quickLookUrl, sceneViewerUrl } from "@/lib/ar-links";

/** Сообщение, которым Safari передаёт нажатие на кнопку плашки в Quick Look. */
const quickLookTap = "_apple_ar_quicklook_button_tapped";

/**
 * Кнопка «Открыть камеру» (AR-4, TICKETS-ar.md): картина в настоящем
 * размере на стене через камеру телефона.
 *
 * Камеру открывает не сайт, а просмотрщик самого телефона: на iPhone —
 * AR Quick Look (файл USDZ), на Android — Scene Viewer (файл GLB). Поэтому
 * здесь нет ни трёхмерной библиотеки, ни доступа к камере — только выбор,
 * какой просмотрщик позвать. Платформа определяется в момент нажатия:
 * до него знать её незачем, а на сервере её не узнать.
 *
 * Внизу камеры — плашка: название, размер и «Написать о картине». На
 * iPhone её рисует Quick Look и сообщает о нажатии событием `message`
 * на ссылке `rel="ar"`, на Android — кнопка Scene Viewer по параметру
 * `link`. Без телефона для WhatsApp плашки нет: Apple не показывает
 * её без кнопки, а кнопка в никуда хуже никакой.
 *
 * Где камера не откроется, кнопка говорит об этом словами через `onNotice`:
 * молча не сработавшая кнопка выглядит поломкой.
 */
export function ArCameraButton({
  usdzUrl,
  glbUrl,
  title,
  subtitle,
  contactUrl,
  className,
  children,
  onNotice,
}: {
  usdzUrl: string;
  glbUrl: string;
  title: string;
  /** Размер для плашки: «Холст 60 × 60 см · в раме 74 × 74 см». */
  subtitle: string;
  /** Куда ведёт «Написать о картине» — ссылка WhatsApp с готовым текстом. */
  contactUrl?: string;
  className?: string;
  children: ReactNode;
  onNotice: (text: string) => void;
}) {
  // Ссылка rel="ar" живёт в разметке постоянно, а не создаётся на лету:
  // нажатие на плашку Safari присылает событием именно на неё, и с iOS 16
  // до оторванной от страницы ссылки оно не доходит.
  const quickLookLink = useRef<HTMLAnchorElement>(null);

  // Android без ARCore возвращает на страницу с меткой в адресе.
  useEffect(() => {
    if (window.location.hash !== noCameraHash) return;
    onNotice(
      "На этом телефоне примерка через камеру не работает: ему нужны сервисы Google Play для AR.",
    );
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [onNotice]);

  useEffect(() => {
    const link = quickLookLink.current;
    if (link === null || contactUrl === undefined) return;

    const onMessage = (event: Event) => {
      if (event instanceof MessageEvent && event.data === quickLookTap) {
        window.location.href = contactUrl;
      }
    };
    link.addEventListener("message", onMessage);
    return () => link.removeEventListener("message", onMessage);
  }, [contactUrl]);

  function open() {
    const agent = navigator.userAgent;
    // iPad с iPadOS 13+ представляется компьютером Mac, выдаёт его сенсорный экран.
    const isApple =
      /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
    const page = new URL(window.location.href);
    page.hash = "";

    if (isApple) {
      const link = quickLookLink.current;
      // Поддержку выдаёт relList: во встроенных браузерах Instagram
      // и Telegram её нет.
      if (link === null || !link.relList.supports("ar")) {
        onNotice("Камера открывается только в Safari: нажмите «…» и «Открыть в браузере».");
        return;
      }
      link.href = quickLookUrl(usdzUrl, {
        pageUrl: page.href,
        banner:
          contactUrl === undefined ? undefined : { title, subtitle, action: "Написать о картине" },
      });
      link.click();
      return;
    }

    if (/Android/.test(agent)) {
      page.hash = noCameraHash;
      window.location.href = sceneViewerUrl({
        glbUrl: new URL(glbUrl, window.location.href).href,
        title,
        link: contactUrl,
        fallbackUrl: page.href,
      });
      return;
    }

    onNotice("Камера есть только на телефоне: откройте эту страницу на iPhone или Android.");
  }

  return (
    <>
      <button type="button" className={className} onClick={open}>
        {children}
      </button>
      {/* Apple требует картинку внутри ссылки rel="ar", иначе Safari
          скачает файл вместо камеры. Ссылку никто не видит: её нажимает
          кнопка выше. */}
      <a ref={quickLookLink} rel="ar" href={usdzUrl} hidden aria-hidden="true" tabIndex={-1}>
        {/* eslint-disable-next-line @next/next/no-img-element -- пустая картинка-требование Apple, не изображение */}
        <img alt="" />
      </a>
    </>
  );
}
