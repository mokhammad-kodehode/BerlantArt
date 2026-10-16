/**
 * Тёплые слова в админке — подарок художнице от сына (заказчик, 13.10.2026).
 *
 * Тексты фраз — его, дословно. Текст открытки ко дню рождения —
 * в components/admin/BirthdayCard.tsx. Добавить новую — дописать строку
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

/** День рождения художницы — 26 марта (заказчик, 16.10.2026). */
const birthday = { month: 3, day: 26 };

/**
 * Сколько дней после дня рождения открытка ещё ждёт первого входа.
 * Не зашла 26-го — увидит, когда зайдёт (заказчик, 16.10.2026). Но не
 * в декабре: поздравление через полгода выглядело бы ошибкой сайта.
 */
const birthdayCardDays = 30;

const dayMs = 24 * 60 * 60 * 1000;

/** Час и дата у художницы, а не у сервера. */
function artistClock(now: Date): { hour: number; day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    hour: "numeric",
    hourCycle: "h23",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: artistTimeZone,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);

  return { hour: part("hour"), day: part("day"), month: part("month"), year: part("year") };
}

/**
 * Год, к которому сейчас ждёт открытка ко дню рождения, или `null`, если
 * не ждёт. Ждёт с 26 марта по Грозному и `birthdayCardDays` дней после.
 * Увидела ли художница её в этом году — помнит браузер, по году
 * (components/admin/BirthdayCard.tsx).
 */
export function birthdayCardYear(now: Date): number | null {
  const { day, month, year } = artistClock(now);
  const daysSince =
    (Date.UTC(year, month - 1, day) - Date.UTC(year, birthday.month - 1, birthday.day)) / dayMs;

  return daysSince >= 0 && daysSince < birthdayCardDays ? year : null;
}

/** Приветствие по времени суток у художницы: «Доброе утро» и так далее. */
export function greeting(now: Date): string {
  const { hour } = artistClock(now);

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
