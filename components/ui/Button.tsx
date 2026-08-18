import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "onDark";

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  onDark: "btn-on-dark",
};

type CommonProps = {
  variant?: ButtonVariant;
  /** Крупный размер — для главных призывов на hero и в баннерах. */
  size?: "md" | "lg";
  block?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Кнопка-ссылка. Основной вариант на публичных страницах: почти каждое
 * действие здесь — переход, а не отправка формы.
 */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  block,
  className,
  children,
  ...rest
}: CommonProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link
      href={href}
      className={cn(
        "btn",
        variantClass[variant],
        size === "lg" && "btn-lg",
        block && "btn-block",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Настоящая кнопка — для форм и действий в админке. */
export function Button({
  variant = "secondary",
  size = "md",
  block,
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button
      type={type}
      className={cn(
        "btn",
        variantClass[variant],
        size === "lg" && "btn-lg",
        block && "btn-block",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
