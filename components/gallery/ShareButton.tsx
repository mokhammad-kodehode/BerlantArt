"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { ContactIcon } from "@/components/ui/ContactIcon";
import { PopoverMenu } from "@/components/ui/PopoverMenu";
import { useDictionary } from "@/lib/i18n/client";

/**
 * «Поделиться» на странице работы.
 *
 * На телефоне и планшете — системное меню: в нём уже есть всё, что
 * установлено у человека, — WhatsApp, Telegram, Instagram. Кнопки «сразу
 * в Instagram» у сайтов не бывает: Instagram такой возможности им не
 * даёт, ссылку он принимает только в Директ.
 *
 * На компьютере — своё меню: «Скопировать ссылку», WhatsApp, Telegram,
 * ВКонтакте, почта (решение заказчика 8.10.2026). Системное окно Windows
 * для этого неудобно, а в Firefox его нет вовсе. Телефон от компьютера
 * отличаем по пальцу (pointer: coarse), а не по ширине: планшет широкий,
 * но системное меню у него есть и привычнее.
 *
 * Подпись до нажатия одна для всех: сервер не знает, какое устройство
 * у посетителя, и разная подпись разошлась бы с разметкой при гидратации.
 */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const t = useDictionary();
  const [isCopied, setIsCopied] = useState(false);
  const text = t.work.shareText(title, t.site.artistGenitive);

  // Надпись «скопирована» гаснет сама; таймер снимается, если человек
  // ушёл со страницы раньше.
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [isCopied]);

  async function copyLink(): Promise<void> {
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
  }

  async function shareFromPhone(): Promise<void> {
    try {
      await navigator.share({ title: text, text, url });
    } catch (error) {
      // Человек закрыл меню — обычное дело, не ошибка и не повод
      // копировать ссылку за него.
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Любой другой отказ меню — копируем ссылку: так кнопка всё равно
      // делает то, что обещает.
      await copyLink();
    }
  }

  function handleTrigger(event: MouseEvent<HTMLButtonElement>): void {
    const isPhone = window.matchMedia("(pointer: coarse)").matches;
    if (!isPhone || typeof navigator.share !== "function") return;
    // Своё меню не открываем — вместо него системное.
    event.preventDefault();
    void shareFromPhone();
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const links = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      key: "vk",
      label: t.work.shareVk,
      href: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`,
    },
  ] as const;

  return (
    <PopoverMenu
      onTriggerClick={handleTrigger}
      label={
        <>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
          </svg>
          {isCopied ? t.work.shareCopied : t.work.share}
          {/* Смена подписи на кнопке скринридер не зачитывает — для него
              отдельная живая область. */}
          <span role="status" className="sr-only">
            {isCopied ? t.work.shareCopied : ""}
          </span>
        </>
      }
    >
      <button type="button" className="menu-item" onClick={() => void copyLink()}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
        {t.work.shareCopy}
      </button>

      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="menu-item"
        >
          {link.key === "vk" ? (
            // У ВКонтакте нет значка среди способов связи: простой знак
            // «VK» в рамке той же линией, что остальные.
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <path d="M7 9.5 9 15l2-5.5M14 9.5V15M14 12.5l3-3M14 12.5l3 2.5" />
            </svg>
          ) : (
            <ContactIcon id={link.key} className="size-5" />
          )}
          {link.label}
        </a>
      ))}

      <a
        href={`mailto:?subject=${encodedText}&body=${encodedText}%0A${encodedUrl}`}
        className="menu-item"
      >
        <ContactIcon id="email" className="size-5" />
        {t.contacts.email}
      </a>
    </PopoverMenu>
  );
}
