/**
 * Склейка классов с отбрасыванием пустых значений.
 *
 * Отдельная зависимость (clsx) ради этих восьми строк не нужна — API тот же,
 * а в бандле на пакет меньше.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
