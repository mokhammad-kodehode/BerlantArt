"use client";

import { useEffect, type ReactNode } from "react";

import { noCameraHash, quickLookUrl, sceneViewerUrl } from "@/lib/ar-links";

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
 * Где камера не откроется, кнопка говорит об этом словами через `onNotice`:
 * молча не сработавшая кнопка выглядит поломкой.
 */
export function ArCameraButton({
  usdzUrl,
  glbUrl,
  title,
  className,
  children,
  onNotice,
}: {
  usdzUrl: string;
  glbUrl: string;
  title: string;
  className?: string;
  children: ReactNode;
  onNotice: (text: string) => void;
}) {
  // Android без ARCore возвращает на страницу с меткой в адресе.
  useEffect(() => {
    if (window.location.hash !== noCameraHash) return;
    onNotice(
      "На этом телефоне примерка через камеру не работает: ему нужны сервисы Google Play для AR.",
    );
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [onNotice]);

  function open() {
    const agent = navigator.userAgent;
    // iPad с iPadOS 13+ представляется компьютером Mac, выдаёт его сенсорный экран.
    const isApple =
      /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);

    if (isApple) {
      // Quick Look открывается только ссылкой rel="ar" с картинкой внутри —
      // так требует Apple, иначе Safari просто скачает файл. Поддержку
      // выдаёт relList: во встроенных браузерах Instagram и Telegram её нет.
      const anchor = document.createElement("a");
      if (!anchor.relList.supports("ar")) {
        onNotice("Камера открывается только в Safari: нажмите «…» и «Открыть в браузере».");
        return;
      }
      anchor.rel = "ar";
      anchor.href = quickLookUrl(usdzUrl);
      anchor.appendChild(document.createElement("img"));
      anchor.click();
      return;
    }

    if (/Android/.test(agent)) {
      const page = new URL(window.location.href);
      page.hash = noCameraHash;
      window.location.href = sceneViewerUrl({
        glbUrl: new URL(glbUrl, window.location.href).href,
        title,
        fallbackUrl: page.href,
      });
      return;
    }

    onNotice("Камера есть только на телефоне: откройте эту страницу на iPhone или Android.");
  }

  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
