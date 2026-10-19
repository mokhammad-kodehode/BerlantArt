"use client";

import { useEffect } from "react";

/**
 * Возврат со страницы работы к её плитке: «← Все работы» ведёт на
 * `/gallery#work-<id>` (ArtworkStage), а прокручивает к плитке этот
 * компонент.
 *
 * Сам браузер по якорю не доезжал: в собранном сайте Next после перехода
 * поднимает страницу наверх, и галерея открывалась сверху (заказчик,
 * 19.10.2026; в режиме разработки этого не видно). Поэтому прокрутка —
 * здесь, после того как стена уже на странице, и кадром позже, чтобы
 * встать после прокрутки самого Next, а не перед ней.
 */
export function ReturnToTile() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("work-")) return;

    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
