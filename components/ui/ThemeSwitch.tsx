"use client";

import { cn } from "@/lib/cn";

/**
 * Переключатель зала: почти белый (по умолчанию) и тёмный.
 *
 * Клиентский по необходимости — он трогает атрибут на `<html>` и
 * localStorage. Больше ничего клиентского темам не нужно: цвета живут
 * в CSS-переменных (app/globals.css, блок «залы»), и смена атрибута
 * перекрашивает страницу сама.
 *
 * Своего состояния у компонента нет — и это не экономия, а требование
 * правильности: выбранный зал уже записан в атрибуте `<html>`, который
 * до отрисовки выставил встроенный скрипт из app/layout.tsx. Держи мы
 * копию в `useState`, сервер отрисовал бы «тёмный», браузер — настоящий
 * выбор, и React пожаловался бы на расхождение разметки. Поэтому какой
 * кружок выбран, решает CSS по тому же атрибуту (класс `.hall` там же).
 *
 * Кружки залиты прямыми значениями, а не токенами, — единственное место,
 * где так можно: образец показывает цвет *другого* зала, а токен всегда
 * отдаёт цвет текущего.
 */
const halls = [
  { value: "paper", label: "Светлый зал", swatch: "#f6f5f3" },
  { value: "dark", label: "Тёмный зал", swatch: "#131211" },
] as const;

type Hall = (typeof halls)[number]["value"];

/** Ключ в localStorage. То же имя читает встроенный скрипт в app/layout.tsx. */
const STORAGE_KEY = "hall";

/**
 * Применяет выбор: атрибут на `<html>` перекрашивает страницу, запись
 * в localStorage переживает перезагрузку.
 *
 * Живёт вне компонента намеренно: правка документа из тела компонента —
 * это правка значения, объявленного снаружи, и линтер правил React-хуков
 * такое запрещает.
 */
function applyHall(value: Hall): void {
  const root = document.documentElement;

  // Тёмный зал в CSS живёт без атрибута, поэтому атрибут снимается,
  // а не ставится (почему так — в app/globals.css, блок «залы»).
  if (value === "dark") delete root.dataset.theme;
  else root.dataset.theme = value;

  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Приватный режим браузера запрещает запись. Тогда выбор просто
    // не переживёт перезагрузку — ронять из-за этого страницу незачем.
  }
}

export function ThemeSwitch({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="group"
      aria-label="Освещение зала"
    >
      {halls.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => applyHall(option.value)}
          title={option.label}
          aria-label={option.label}
          /*
            Обводка выбранного — `outline` из CSS, а не рамка: рамка меняла
            бы размер кружка, и ряд дёргался бы при переключении.
          */
          className={cn("hall", `hall-${option.value}`)}
          style={{ background: option.swatch }}
        />
      ))}
    </div>
  );
}
