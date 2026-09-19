"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import type { ArtworkLink } from "@/lib/artworks";

/** Пометка в адресе: страница работы, открытая с ней, сразу показывает просмотр. */
const VIEW_HASH = "#view";

/**
 * Просмотр картины: нажатие на холст открывает его на весь экран, на тёмном
 * фоне — только живопись, название внизу и стрелки по бокам, как в просмотре
 * у Netflix. По просьбе заказчика.
 *
 * Окно — встроенный в браузер `<dialog>`: закрытие по Esc, ловушка фокуса
 * и возврат фокуса на кнопку после закрытия в нём уже есть, писать своё
 * не нужно. Закрывается и по клику в любом месте, кроме стрелок: на телефоне
 * до крестика в углу тянуться неудобно, а нажать на картину — естественно.
 *
 * Листание — переход на страницу соседней работы с пометкой #view в адресе,
 * и та страница открывает просмотр сама. Так, а не подменой картинки внутри
 * окна: соседей уже считает страница, «назад» в браузере возвращает
 * к предыдущей картине в том же режиме, ссылку можно переслать. Пометка
 * после # не доходит до сервера, поэтому страницы остаются собранными
 * заранее — searchParams сделали бы каждую динамической.
 *
 * Картина в окне — та же фотография с тем же `sizes`, что на сцене, поэтому
 * браузер берёт её из кэша, второй закачки нет. Пока окно закрыто, оно
 * скрыто, и ленивое изображение внутри не грузится вовсе.
 *
 * Фон окна тёмный в любом зале, не из темы: здесь нет интерфейса, которому
 * нужно совпадать с сайтом, и тёмное поле меньше всего спорит с картиной.
 */
export function ArtworkViewer({
  src,
  title,
  prev,
  next,
  children,
}: {
  src: string;
  title: string;
  prev?: ArtworkLink | null;
  next?: ArtworkLink | null;
  /** То, что показано на странице: по нажатию на него окно и открывается. */
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // Пришли стрелкой из просмотра — открываем сразу. Layout-эффект, а не
  // обычный: он срабатывает до отрисовки, и страница работы не мелькает
  // между двумя картинами.
  useLayoutEffect(() => {
    if (window.location.hash === VIEW_HASH) dialogRef.current?.showModal();
  }, []);

  // Стрелки клавиатуры листают, пока открыт просмотр.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.key === "ArrowLeft" ? prev : event.key === "ArrowRight" ? next : null;
      if (target) router.push(`/gallery/${target.id}${VIEW_HASH}`);
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [prev, next, router]);

  function open(): void {
    dialogRef.current?.showModal();
    // replaceState, а не новая запись в истории: иначе «назад» после
    // закрытия просмотра вело бы на эту же страницу.
    history.replaceState(history.state, "", VIEW_HASH);
  }

  // Убирает #view из адреса. Зовётся и из клика, и из события close:
  // close приходит отложенно (в скрытой вкладке — не приходит, пока её
  // не покажут), а после клика адрес должен очиститься сразу. Повторный
  // вызов безвреден.
  function clearViewHash(): void {
    if (window.location.hash !== VIEW_HASH) return;
    history.replaceState(history.state, "", window.location.pathname);
  }

  // Клик по стрелке — переход, а не закрытие: он всплывает до окна,
  // и без этой проверки просмотр закрывался бы раньше, чем начался переход.
  function handleDialogClick(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target instanceof Element && event.target.closest("a")) return;
    dialogRef.current?.close();
    clearViewHash();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Открыть «${title}» во весь экран`}
        className="absolute inset-0 block cursor-zoom-in border-0 bg-transparent p-0"
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-label={title}
        onClick={handleDialogClick}
        // Esc закрывает окно сам, без нашего клика, — адрес чистим здесь.
        onClose={clearViewHash}
        className="viewer cursor-zoom-out"
      >
        {/* Поле вокруг картины: холст, упёртый в край экрана, читается
            обрезанным, даже когда виден целиком. Снизу поле шире — там
            название, и оно не должно ложиться на живопись. */}
        <div className="absolute inset-x-3 top-3 bottom-20 lg:inset-x-24 lg:top-8 lg:bottom-24">
          <Image src={src} alt={title} fill sizes="100vw" className="object-contain" />
        </div>

        <p className="font-heading absolute inset-x-0 bottom-0 m-0 truncate pr-[128px] pb-6 pl-5 text-[clamp(22px,3vw,36px)] leading-tight text-neutral-100 lg:px-24 lg:pb-8">
          {title}
        </p>

        {prev && (
          <Link
            href={`/gallery/${prev.id}${VIEW_HASH}`}
            aria-label={`Предыдущая работа: «${prev.title}»`}
            className="viewer-nav right-[68px] lg:right-auto lg:left-6"
          >
            ←
          </Link>
        )}
        {next && (
          <Link
            href={`/gallery/${next.id}${VIEW_HASH}`}
            aria-label={`Следующая работа: «${next.title}»`}
            className="viewer-nav right-4 lg:right-6"
          >
            →
          </Link>
        )}

        {/* Отдельная кнопка — для клавиатуры и скринридера: клик по фону
            им недоступен. Esc закрывает окно и без неё. */}
        <button
          type="button"
          aria-label="Закрыть просмотр"
          className="absolute top-4 right-4 z-[2] flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-neutral-900/60 text-[22px] leading-none text-neutral-100"
        >
          ×
        </button>
      </dialog>
    </>
  );
}
