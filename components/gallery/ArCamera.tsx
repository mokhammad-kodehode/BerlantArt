"use client";

import { useEffect, useRef, type RefObject } from "react";

import { noCameraHash, quickLookUrl, sceneViewerUrl } from "@/lib/ar-links";
import { useDictionary } from "@/lib/i18n/client";

/** Сообщение, которым Safari передаёт нажатие на кнопку плашки в Quick Look. */
const quickLookTap = "_apple_ar_quicklook_button_tapped";

/** Что откроет камеру на этом устройстве. */
export type ArPlatform = "ios" | "android" | "ios-in-app" | "desktop";

export type ArCameraModel = {
  usdzUrl: string;
  glbUrl: string;
  title: string;
  /** Размер для плашки в камере: «Холст 60 × 60 см · в раме 74 × 74 см». */
  subtitle: string;
  /** Куда ведёт «Написать о картине» — ссылка WhatsApp с готовым текстом. */
  contactUrl?: string;
};

/**
 * Камера телефона для примерки (AR-4, TICKETS-ar.md).
 *
 * Камеру открывает не сайт, а просмотрщик самого телефона: на iPhone —
 * AR Quick Look (файл USDZ), на Android — Scene Viewer (файл GLB). Здесь
 * нет ни трёхмерной библиотеки, ни доступа к камере — только выбор,
 * какой просмотрщик позвать, и адрес для него.
 *
 * Внизу камеры — плашка: название, размер и «Написать о картине». На
 * iPhone её рисует Quick Look и сообщает о нажатии событием `message`
 * на ссылке `rel="ar"`, на Android — кнопка Scene Viewer по параметру
 * `link`. Без телефона для WhatsApp плашки нет: Apple не показывает её
 * без кнопки, а кнопка в никуда хуже никакой.
 */
export function useArCamera(
  model: ArCameraModel | null,
  onNotice: (text: string) => void,
): {
  linkRef: RefObject<HTMLAnchorElement | null>;
  detect: () => ArPlatform;
  launch: (platform: ArPlatform) => void;
} {
  // Ссылка rel="ar" живёт в разметке постоянно (ArQuickLookLink), а не
  // создаётся на лету: нажатие на плашку Safari присылает событием именно
  // на неё, и с iOS 16 до оторванной от страницы ссылки оно не доходит.
  const t = useDictionary().ar;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const contactUrl = model?.contactUrl;

  // Android без ARCore возвращает на страницу с меткой в адресе.
  useEffect(() => {
    if (window.location.hash !== noCameraHash) return;
    onNotice(t.noArcore);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [onNotice, t.noArcore]);

  useEffect(() => {
    const link = linkRef.current;
    if (link === null || contactUrl === undefined) return;

    const onMessage = (event: Event) => {
      if (event instanceof MessageEvent && event.data === quickLookTap) {
        window.location.href = contactUrl;
      }
    };
    link.addEventListener("message", onMessage);
    return () => link.removeEventListener("message", onMessage);
  }, [contactUrl]);

  function detect(): ArPlatform {
    const agent = navigator.userAgent;
    // iPad с iPadOS 13+ представляется компьютером Mac, выдаёт его сенсорный экран.
    const isApple =
      /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);

    if (isApple) {
      // Поддержку выдаёт relList: во встроенных браузерах Instagram
      // и Telegram её нет.
      return linkRef.current?.relList.supports("ar") ? "ios" : "ios-in-app";
    }
    return /Android/.test(agent) ? "android" : "desktop";
  }

  function launch(platform: ArPlatform) {
    if (model === null) return;

    if (platform === "desktop") {
      onNotice(t.desktop);
      return;
    }
    if (platform === "ios-in-app") {
      onNotice(t.inApp);
      return;
    }

    const page = new URL(window.location.href);
    page.hash = "";

    if (platform === "ios") {
      const link = linkRef.current;
      if (link === null) return;
      link.href = quickLookUrl(model.usdzUrl, {
        pageUrl: page.href,
        banner:
          model.contactUrl === undefined
            ? undefined
            : { title: model.title, subtitle: model.subtitle, action: t.action },
      });
      link.click();
      return;
    }

    page.hash = noCameraHash;
    window.location.href = sceneViewerUrl({
      glbUrl: new URL(model.glbUrl, window.location.href).href,
      title: model.title,
      link: model.contactUrl,
      fallbackUrl: page.href,
    });
  }

  return { linkRef, detect, launch };
}

/**
 * Ссылка для Quick Look. Apple требует картинку внутри ссылки rel="ar",
 * иначе Safari скачает файл вместо камеры. Ссылку никто не видит: её
 * нажимает `launch`.
 */
export function ArQuickLookLink({
  linkRef,
  href,
}: {
  linkRef: RefObject<HTMLAnchorElement | null>;
  href: string;
}) {
  return (
    <a ref={linkRef} rel="ar" href={href} hidden aria-hidden="true" tabIndex={-1}>
      {/* eslint-disable-next-line @next/next/no-img-element -- пустая картинка-требование Apple, не изображение */}
      <img alt="" />
    </a>
  );
}
