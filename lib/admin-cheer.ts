/**
 * Тёплые слова в админке — подарок художнице от сына (заказчик, 13.10.2026).
 *
 * Тексты фраз — его, дословно. Добавить новую — дописать строку
 * в `warmWords`, больше нигде ничего менять не нужно.
 */

/** Фразы после сохранения работы. Показывается одна, по очереди случайно. */
export const warmWords = [
  "Ты лучшая мама в мире",
  "Я люблю тебя, мама",
  "Лучший художник Чеченской Республики",
  "Лучшая художница в мире — Берлант",
] as const;

/**
 * Часовой пояс художницы. Сервер Vercel живёт по Гринвичу, и без пояса
 * в девять утра в Грозном админка желала бы доброй ночи.
 */
const artistTimeZone = "Europe/Moscow";

/** Приветствие по времени суток у художницы: «Доброе утро» и так далее. */
export function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("ru-RU", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: artistTimeZone,
    }).format(now),
  );

  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 18) return "Добрый день";
  if (hour >= 18 && hour < 23) return "Добрый вечер";
  return "Доброй ночи";
}

/**
 * Случайная фраза из `warmWords`, но не та же, что в прошлый раз: два
 * сохранения подряд с одинаковой фразой выглядят как заготовка.
 */
export function pickWarmWords(previous?: string, random: () => number = Math.random): string {
  const choices = warmWords.filter((words) => words !== previous);
  return choices[Math.floor(random() * choices.length)] ?? warmWords[0];
}
