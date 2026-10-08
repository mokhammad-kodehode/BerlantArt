"use client";

import { useId, useRef, type MouseEvent, type ReactNode } from "react";

import { Button, type ButtonVariant } from "@/components/ui/Button";

/**
 * Кнопка с меню под ней: «Написать художнице» (WhatsApp или почта) и
 * «Поделиться» на компьютере.
 *
 * Меню — встроенный в браузер popover, а не своё состояние «открыто /
 * закрыто»: закрытие по клику мимо и по Esc, слой поверх страницы и
 * отметка «раскрыто» для скринридера у кнопки браузер делает сам.
 * Своего кода остаётся два действия — привязать меню к кнопке и закрыть
 * его после выбора пункта.
 *
 * Привязка — через anchor-name: имя уникально для каждой кнопки (useId),
 * иначе две кнопки на одной странице делили бы одно меню. Где браузер
 * привязки не умеет, меню встаёт по центру экрана или листом снизу
 * (globals.css, .menu-pop).
 *
 * Пункты — `children` с классом `menu-item`: ссылки (`<a>`) или кнопки.
 *
 * Клиентский: обработчики нажатия есть только в браузере.
 */
export function PopoverMenu({
  label,
  variant = "soft",
  size = "lg",
  onTriggerClick,
  children,
}: {
  label: ReactNode;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  /**
   * Перехват нажатия на кнопку: вызвал `event.preventDefault()` — меню
   * не откроется. Так «Поделиться» на телефоне открывает системное меню
   * вместо своего.
   */
  onTriggerClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = `menu-${id}`;
  // Имя привязки — CSS-идентификатор, а useId даёт и служебные символы.
  const anchor = `--menu-${id.replace(/[^\w-]/g, "")}`;

  // Выбрал пункт — меню больше не нужно. Ссылка в новой вкладке иначе
  // оставляла бы его открытым, когда человек вернётся на страницу.
  function closeOnChoice(event: MouseEvent<HTMLDivElement>): void {
    if (event.target instanceof Element && event.target.closest("a, button")) {
      popoverRef.current?.hidePopover();
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        popoverTarget={popoverId}
        onClick={onTriggerClick}
        style={{ anchorName: anchor }}
      >
        {label}
      </Button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        onClick={closeOnChoice}
        className="menu-pop"
        style={{ positionAnchor: anchor }}
      >
        {children}
      </div>
    </>
  );
}
