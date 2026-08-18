import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TagTone = "accent" | "accent2" | "neutral" | "outline";

const toneClass: Record<TagTone, string> = {
  accent: "tag-accent",
  accent2: "tag-accent-2",
  neutral: "tag-neutral",
  outline: "tag-outline",
};

/**
 * Небольшая метка-таблетка: статус работы, раздел, пометка «скоро».
 * На этапе 4 сюда придут статусы AVAILABLE / SOLD / RESERVED.
 */
export function Tag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn("tag", toneClass[tone], className)}>{children}</span>;
}
