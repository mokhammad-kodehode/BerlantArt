import { encode } from "uqr";

/**
 * QR-код для телефона на экране «Картина и рама» с компьютера
 * (TICKETS-primerka.md, П-5): навёл камеру телефона — открылась та же
 * примерочная, а там камера.
 *
 * Модули кода — одним контуром для SVG: сотни квадратиков одним путём
 * легче сотен элементов. Пакет `uqr` (решение 10) работает только здесь,
 * на сервере: код рисуется в разметку, и в браузер пакет не попадает.
 */
export function qrPath(text: string): { size: number; path: string } {
  // M — средний запас на ошибки: код на экране не мнётся и не пачкается,
  // а модули крупнее — камера телефона берёт его быстрее.
  const { size, data } = encode(text, { ecc: "M", border: 2 });
  const parts: string[] = [];
  data.forEach((row, y) =>
    row.forEach((isDark, x) => {
      if (isDark) parts.push(`M${x} ${y}h1v1h-1z`);
    }),
  );
  return { size, path: parts.join("") };
}
