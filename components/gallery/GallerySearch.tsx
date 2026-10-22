"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { gallerySearchPath } from "@/lib/gallery-routes";
import { categoryParam, galleryHref } from "@/lib/gallery-search";
import { useDictionary } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

/**
 * Пауза после последней буквы перед поиском. Меньше — запрос уходил бы на
 * каждую букву «р-о-м-а-ш», больше — поиск казался бы задумчивым.
 */
const typingPauseMs = 300;

/**
 * Поле поиска в галерее (заказчик, 12.10.2026).
 *
 * Выдача обновляется по мере набора, без кнопки «Найти»: через паузу
 * запрос уходит в адрес (`/gallery/search?q=`, тикет О-11), а находит работы сервер — как и фильтр
 * по категории ([architecture.md](../../.ai/rules/architecture.md):
 * состояние живёт в адресе, ссылку на выдачу можно переслать). Адрес
 * меняется через replace, а не push: иначе каждая пауза при наборе
 * оседала бы в истории, и «Назад» листал бы буквы.
 *
 * Без JavaScript это обычная форма: Enter отправит её тем же адресом.
 * Выбранная категория уходит скрытым полем — поиск ищет внутри неё.
 */
export function GallerySearch({
  lang,
  category,
  query,
}: {
  lang: Locale;
  category?: string;
  /** Запрос из адреса как есть — его и показывает поле. */
  query?: string;
}) {
  const t = useDictionary().gallery;
  const router = useRouter();
  const [value, setValue] = useState(query ?? "");
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  // Что поле само последним отправило в адрес. Адрес догоняет набор с
  // опозданием, и без этой отметки пришедший старый запрос стирал бы
  // буквы, набранные за это время.
  const lastSent = useRef(query ?? "");

  // Адрес сменился не из поля — «Показать все работы», «Назад»: поле
  // показывает то, что в адресе.
  useEffect(() => {
    if ((query ?? "") === lastSent.current) return;
    lastSent.current = query ?? "";
    setValue(query ?? "");
  }, [query]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function search(next: string): void {
    clearTimeout(timer.current);
    lastSent.current = next;
    const q = next.trim() === "" ? undefined : next;
    startTransition(() => router.replace(galleryHref(lang, { category, q }), { scroll: false }));
  }

  function type(next: string): void {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(next), typingPauseMs);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    search(value);
  }

  function clear(): void {
    setValue("");
    search("");
    input.current?.focus();
  }

  return (
    <form
      role="search"
      action={gallerySearchPath(lang)}
      method="get"
      onSubmit={submit}
      className="search-field"
      data-pending={isPending || undefined}
      aria-busy={isPending}
    >
      <label htmlFor="gallery-search" className="sr-only">
        {t.searchLabel}
      </label>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="search-field-icon">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        ref={input}
        id="gallery-search"
        type="search"
        name="q"
        value={value}
        onChange={(event) => type(event.target.value)}
        placeholder={t.searchPlaceholder}
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
      />
      {category && <input type="hidden" name="category" value={categoryParam(category)} />}
      {value !== "" && (
        <button
          type="button"
          onClick={clear}
          className="search-field-clear"
          aria-label={t.searchClear}
          title={t.searchClear}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7 7 17" />
          </svg>
        </button>
      )}
    </form>
  );
}
