import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Колонка контента: максимум 1200px и «резиновые» поля от 20 до 64px.
 * Ровно те же значения, что в макете — на всех страницах контент встаёт
 * по одной вертикали.
 */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-[clamp(20px,5vw,64px)]", className)}>
      {children}
    </div>
  );
}
