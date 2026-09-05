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
    <div className="mb-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Фильтр по статусу">
        {statusOptions.map((option) => {
          const active = current.status === option.value;
          return (
            <ButtonLink
              key={option.label}
              href={galleryHref(current, { status: option.value })}
              variant={active ? "primary" : "secondary"}
              aria-current={active ? "page" : undefined}
            >
              {option.label}
            </ButtonLink>
          );
        })}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Фильтр по категории">
          <ButtonLink
            href={galleryHref(current, { category: undefined })}
            variant={!current.category ? "primary" : "secondary"}
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
                variant={active ? "primary" : "secondary"}
                aria-current={active ? "page" : undefined}
              >
                {category}
              </ButtonLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
