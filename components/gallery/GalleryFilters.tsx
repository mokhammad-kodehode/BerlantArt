import { ButtonLink } from "@/components/ui/Button";
import type { ArtworkStatus } from "@/lib/artworks";

/** Разобранные и проверенные параметры адреса — то, что реально ушло в запрос. */
export type GalleryFilters = {
  status?: ArtworkStatus;
  category?: string;
};

const statusOptions: Array<{ value: ArtworkStatus | undefined; label: string }> = [
  { value: undefined, label: "Все" },
  { value: "AVAILABLE", label: "Доступные" },
  { value: "SOLD", label: "Проданные" },
];

/**
 * Собирает адрес `/gallery` с текущими фильтрами и одной применённой правкой.
 *
 * Не тронутый параметр сохраняется, а не сбрасывается: клик по категории
 * не должен снимать выбранный статус, и наоборот. `undefined` в правке
 * убирает параметр из адреса — так «Все» выглядит как `/gallery`, а не
 * как `/gallery?status=`.
 */
function galleryHref(current: GalleryFilters, override: Partial<GalleryFilters>): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  if (merged.category) params.set("category", merged.category);

  const query = params.toString();
  return query ? `/gallery?${query}` : "/gallery";
}

/**
 * Переключатели статуса и категории — ссылки, а не кнопки с обработчиком.
 *
 * Ссылки работают без JavaScript и открываются в новой вкладке; состояние
 * живёт в адресе страницы, поэтому переключение — обычная навигация,
 * а не клиентский код ([architecture.md](../../.ai/rules/architecture.md)).
 *
 * На телефоне все переключатели стоят одной прокручиваемой лентой, а не
 * переносятся по строкам: восемь чипов занимали на 375px четыре ряда — почти
 * треть первого экрана, и стена работ уезжала под сгиб. Лента прокручивается
 * пальцем, у правого края растворяется (класс `filter-rail` в globals.css),
 * так что видно: она продолжается. С 768px — снова два ряда с переносом,
 * там места хватает.
 *
 * Ни выпадающей панели, ни `<select>` — обе потребовали бы либо клиентского
 * состояния, либо кнопки «Показать»: сейчас переключатель это ссылка, и
 * фильтр применяется самим переходом.
 *
 * Невыбранные кнопки — вариант `soft`: он берёт цвет от текста темы
 * и потому читается в любом зале. У `secondary` цвет текста фиксированный,
 * и на тёмной стене контраст падал до 1.4:1 — надписи «Доступные»
 * и «Проданные» почти не читались.
 *
 * «Забронирована» третьей кнопкой статуса не добавлена: её нет в макете,
 * и сейчас нет ни одной работы в этом статусе — она видна под «Все».
 * Фильтра по цене здесь тоже нет: цены пока нет ни у одной работы
 * ([Э4-0.2](../../TICKETS.md)), а писать фильтр для несуществующих данных
 * рано.
 */
export function GalleryFilters({
  current,
  categories,
}: {
  current: GalleryFilters;
  categories: string[];
}) {
  return (
    <div className="filter-rail mb-2 flex gap-2.5 overflow-x-auto pb-1 md:flex-col md:gap-3 md:overflow-visible md:pb-0">
      <div
        className="flex flex-none gap-2.5 md:flex-wrap"
        role="group"
        aria-label="Фильтр по статусу"
      >
        {statusOptions.map((option) => {
          const active = current.status === option.value;
          return (
            <ButtonLink
              key={option.label}
              href={galleryHref(current, { status: option.value })}
              variant={active ? "primary" : "soft"}
              aria-current={active ? "page" : undefined}
            >
              {option.label}
            </ButtonLink>
          );
        })}
      </div>

      {categories.length > 0 && (
        <>
          {/* Разделитель между группами: в одной ленте иначе не видно, где
              кончается статус и начинается сюжет. На десктопе группы стоят
              разными рядами, и он не нужен. */}
          <span aria-hidden className="bg-divider my-1.5 w-px flex-none md:hidden" />

          <div
            className="flex flex-none gap-2.5 md:flex-wrap"
            role="group"
            aria-label="Фильтр по категории"
          >
            <ButtonLink
              href={galleryHref(current, { category: undefined })}
              variant={!current.category ? "primary" : "soft"}
              aria-current={!current.category ? "page" : undefined}
            >
              Все категории
            </ButtonLink>
            {categories.map((category) => {
              const active = current.category === category;
              return (
                <ButtonLink
                  key={category}
                  href={galleryHref(current, { category })}
                  variant={active ? "primary" : "soft"}
                  aria-current={active ? "page" : undefined}
                >
                  {category}
                </ButtonLink>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
