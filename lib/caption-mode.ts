"use client";

import { useSyncExternalStore } from "react";

/**
 * Что показывает колонка подписи на странице работы: описание картины
 * или сетку всех работ (заказчик, 20 и 22.10.2026).
 *
 * Выбор живёт там же, где выбор зала, — атрибутом на `<html>`, а показ
 * решает CSS (app/globals.css, «Описание · Все работы»). Не в состоянии
 * React: страница работы при переходе к соседней собирается заново,
 * и состояние сбрасывалось бы — описание мелькало бы перед сеткой на
 * каждой картине. Атрибут на `<html>` переходы переживает, а после
 * перезагрузки его до отрисовки ставит встроенный скрипт
 * (components/layout/RootDocument.tsx) по записи в sessionStorage.
 *
 * sessionStorage, а не адрес: делиться ссылкой на режим незачем, а адреса
 * с параметром плодили бы копии страниц для поисковиков. И не localStorage:
 * выбор нужен, пока человек листает работы, а не до следующего визита.
 */
export type CaptionMode = "about" | "works";

/**
 * Ключ в sessionStorage и имя атрибута (`data-caption`). Те же строки
 * читает встроенный скрипт в RootDocument.tsx — менять вместе.
 */
const storageKey = "caption";
const worksValue = "works";

/** Событие для подписчиков в этой же вкладке: storage приходит только в другие. */
const changeEvent = "caption-mode-change";

function readCaptionMode(): CaptionMode {
  return document.documentElement.dataset.caption === worksValue ? "works" : "about";
}

/** Сервер выбора не знает: он в браузере. Разметка приходит с описанием. */
function serverCaptionMode(): CaptionMode {
  return "about";
}

function subscribeCaptionMode(onChange: () => void): () => void {
  window.addEventListener(changeEvent, onChange);
  return () => window.removeEventListener(changeEvent, onChange);
}

/**
 * Применяет выбор: атрибут переключает колонку сразу, запись в
 * sessionStorage переживает перезагрузку страницы.
 */
export function applyCaptionMode(mode: CaptionMode): void {
  const root = document.documentElement;
  if (mode === "works") root.dataset.caption = worksValue;
  else delete root.dataset.caption;

  try {
    if (mode === "works") sessionStorage.setItem(storageKey, worksValue);
    else sessionStorage.removeItem(storageKey);
  } catch {
    // Приватный режим браузера запрещает запись. Тогда выбор не переживёт
    // перезагрузку, но на этой странице и при листании работает.
  }

  window.dispatchEvent(new Event(changeEvent));
}

/**
 * Текущий выбор — для `aria-pressed` и прокрутки сетки. Внешний вид от
 * него не зависит: при гидратации здесь сначала «about» с сервера, а CSS
 * по атрибуту уже показывает верное.
 */
export function useCaptionMode(): CaptionMode {
  return useSyncExternalStore(subscribeCaptionMode, readCaptionMode, serverCaptionMode);
}
