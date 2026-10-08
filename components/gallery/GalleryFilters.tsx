import { ButtonLink } from "@/components/ui/Button";
import { artworkCategory } from "@/lib/artworks";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";

/** Разобранные и проверенные параметры адреса — то, что реально ушло в запрос. */
export type GalleryFilters = {
  category?: string;
};

/**
 * Адрес `/gallery` с выбранной категорией. `undefined` убирает параметр —
 * так «Все категории» выглядит как `/gallery`, а не как `/gallery?category=`.
 */
function galleryHref(lang: Locale, category: string | undefined): string {
  const path = localePath(lang, "/gallery");
  return category ? `${path}?${new URLSearchParams({ category })}` : path;
}

/**
 * Переключатели категории — ссылки, а не кнопки с обработчиком.
 *
 * Ссылки работают без JavaScript и открываются в новой вкладке; состояние
 * живёт в адресе страницы, поэтому переключение — обычная навигация,
 * а не клиентский код ([architecture.md](../../.ai/rules/architecture.md)).
 *
 * На телефоне переключатели стоят одной прокручиваемой лентой, а не
 * переносятся по строкам: восемь чипов занимали на 375px четыре ряда — почти
 * треть первого экрана, и стена работ уезжала под сгиб. Лента прокручивается
 * пальцем, у правого края растворяется (класс `filter-rail` в globals.css),
 * так что видно: она продолжается. С 768px — перенос по строкам.
 *
 * Ни выпадающей панели, ни `<select>` — обе потребовали бы либо клиентского
 * состояния, либо кнопки «Показать»: сейчас переключатель это ссылка, и
 * фильтр применяется самим переходом.
 *
 * Невыбранные кнопки — вариант `soft`: он берёт цвет от текста темы
 * и потому читается в любом зале. У `secondary` цвет текста фиксированный,
 * и на тёмной стене контраст падал до 1.4:1.
 *
 * Фильтра «Доступные / Проданные» нет: продажа на сайте выключена
 * (ARCHITECTURE.md, «Продажа выключена»). Старые ссылки с `?status=`
 * не ломаются — параметр просто не читается, и видна вся галерея.
 */
export function GalleryFilters({
  lang,
  current,
  categories,
}: {
  lang: Locale;
  current: GalleryFilters;
  categories: string[];
}) {
  const t = getDictionary(lang).gallery;

  if (categories.length === 0) return null;

  return (
    <div
      className="filter-rail mb-2 flex gap-2.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
      role="group"
      aria-label={t.filterCategory}
    >
      <ButtonLink
        href={galleryHref(lang, undefined)}
        variant={!current.category ? "primary" : "soft"}
        aria-current={!current.category ? "page" : undefined}
        className="flex-none"
      >
        {t.categoryAll}
      </ButtonLink>
      {categories.map((category) => {
        const active = current.category === category;
        return (
          <ButtonLink
            key={category}
            href={galleryHref(lang, category)}
            variant={active ? "primary" : "soft"}
            aria-current={active ? "page" : undefined}
            className="flex-none"
          >
            {artworkCategory(category, lang)}
          </ButtonLink>
        );
      })}
    </div>
  );
}
