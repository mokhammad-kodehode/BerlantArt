import type { artworkCategories } from "./artwork-form";
import { localePath, locales, type Locale } from "./i18n/config";

/**
 * Адреса галереи (тикет О-11):
 *
 * - `/gallery` — вся галерея, готова заранее;
 * - `/gallery/category/flowers` — категория, готова заранее;
 * - `/gallery/search?q=роза` — поиск, живой запрос: вариантов запроса
 *   бесконечно много.
 *
 * **Почему у категории и поиска свои адреса, а не параметры.** До О-11
 * был один адрес с параметрами (`/gallery?category=Цветы`), и страница
 * собиралась на каждый заход. Готовая заранее страница параметров не
 * читает, и для браузера `/gallery?category=Цветы` — та же страница, что
 * `/gallery`: при переходе по ссылке он даже не шёл на сервер, адрес
 * менялся, а стена нет (поймано проверкой 22.10.2026). Подстановка
 * адреса на сервере (`rewrites`) поэтому не годилась; свой путь у
 * категории — годится.
 *
 * **Адреса латиницей.** С кириллицей в пути Next 16.3 при переходе по
 * ссылке пишет путь в заголовок ответа, кириллица в заголовке запрещена —
 * сервер отвечал 500, и браузер перезагружал страницу целиком.
 *
 * Старые ссылки с параметрами (их пересылали в мессенджерах) сервер
 * перенаправляет на новые адреса — `galleryRedirects`.
 *
 * Импорты относительные, а не через `@/`: модуль читает next.config.ts,
 * а там алиасы не работают — так же устроен lib/env.ts.
 */

type ArtworkCategory = (typeof artworkCategories)[number];

/**
 * Латинский адрес каждой категории из утверждённого списка. `satisfies`
 * не даст собрать сайт, если в список добавят категорию и забудут адрес.
 * Менять адрес у существующей категории — значит ломать ссылки на неё.
 */
export const categorySlugs = {
  Горы: "mountains",
  Башни: "towers",
  "Поле и дорога": "fields-and-roads",
  "Деревья и лес": "trees-and-forest",
  Село: "village",
  "Река и мост": "rivers-and-bridges",
  Море: "sea",
  Цветы: "flowers",
  "Старая архитектура": "old-architecture",
  Натюрморт: "still-life",
  Другое: "other",
} as const satisfies Record<ArtworkCategory, string>;

/** Латинский адрес категории или `undefined`, если её нет в списке. */
export function categorySlug(category: string): string | undefined {
  return Object.entries(categorySlugs).find(([name]) => name === category)?.[1];
}

/** Категория по латинскому адресу или `undefined`, если такой нет. */
export function categoryBySlug(slug: string): string | undefined {
  return Object.entries(categorySlugs).find(([, value]) => value === slug)?.[0];
}

/** Адрес готовой страницы категории. */
export function categoryPagePath(lang: Locale, slug: string): string {
  return localePath(lang, `/gallery/category/${slug}`);
}

/** Адрес поиска. */
export function gallerySearchPath(lang: Locale): string {
  return localePath(lang, "/gallery/search");
}

/** Перенаправление в форме, которую понимает `redirects` в next.config.ts. */
export type GalleryRedirect = {
  source: string;
  has: { type: "query"; key: string; value: string }[];
  destination: string;
  permanent: false;
};

/** Символы, которые в регулярном выражении значат не себя. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Старые адреса с параметрами → новые, для обоих языков.
 *
 * Поиск первым: запрос вместе с категорией (`?q=роза&category=Цветы`) —
 * это поиск внутри категории. Next сам окружает условие якорями `^…$`
 * и переносит параметры в новый адрес — поэтому старая ссылка на
 * категорию откроется как `/gallery/category/flowers?category=Цветы`:
 * лишний хвост странице не мешает и в кеш отдельной записью не ложится.
 *
 * Временные (307), а не постоянные: постоянное перенаправление браузер
 * запоминает навсегда, и передумать со схемой адресов было бы нельзя.
 * Категории не из списка перенаправления нет — такой адрес покажет всю
 * галерею, а не ошибку.
 */
export function galleryRedirects(): GalleryRedirect[] {
  return locales.flatMap((lang) => {
    const source = localePath(lang, "/gallery");
    return [
      {
        source,
        has: [{ type: "query" as const, key: "q", value: String.raw`[\s\S]*\S[\s\S]*` }],
        destination: gallerySearchPath(lang),
        permanent: false as const,
      },
      ...Object.entries(categorySlugs).map(([category, slug]) => ({
        source,
        has: [{ type: "query" as const, key: "category", value: escapeRegExp(category) }],
        destination: categoryPagePath(lang, slug),
        permanent: false as const,
      })),
    ];
  });
}
