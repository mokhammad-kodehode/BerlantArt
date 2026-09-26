import { ArtworkTile } from "@/components/ui/ArtworkTile";
import type { ArtworkWithImages } from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { collageLayout } from "@/lib/collage";

/**
 * Стена-коллаж: работы разного размера, плотно и без дыр.
 *
 * Вынесено из страницы галереи, когда появился второй потребитель —
 * главная. Абстракция заведена именно поэтому, а не «на будущее»
 * ([architecture.md](../../.ai/rules/architecture.md)).
 *
 * Высота строки считается от ширины столбца, а не от высоты экрана:
 * мелкая плитка всегда 4:3 (на телефоне — квадрат), крупная 2×2 — тоже
 * около 4:3. Прежде строки были `1fr` и растягивались под окно, и это
 * ломалось в обе стороны: на широком мониторе мелкие плитки сплющивались
 * в полоски 432×120 (почти 4:1), а шесть работ на главной, растянутые
 * на экран, превращались в две гигантские и четыре обрезанные.
 *
 * Ширину столбца даёт `@container` на обёртке: единица `cqw` — процент
 * ширины обёртки без её полей, то есть ровно ширина сетки. Сама сетка
 * контейнером быть не может — `cqw` элемента считается от предка.
 * 10px в формулах — зазор `gap-2.5`: 1 зазор на двух столбцах, 3 на четырёх.
 *
 * `className` уходит обёртке: поля и `flex-1` задаёт вызывающая сторона.
 *
 * Размахи плиток считает lib/collage.ts — там же тест, который следит,
 * чтобы в стене не появилось дыр при любом числе работ.
 */
export function ArtworkCollage({
  works,
  className,
}: {
  works: ArtworkWithImages[];
  className?: string;
}) {
  const tiles = collageLayout(works.length);

  return (
    <div className={cn("@container", className)}>
      <ul className="wall m-0 grid list-none auto-rows-[calc((100cqw-10px)/2)] grid-cols-2 gap-2.5 p-0 md:auto-rows-[calc((100cqw-30px)*3/16)] md:grid-cols-4">
        {works.map((work, index) => (
          <ArtworkTile
            key={work.id}
            work={work}
            className={tiles[index].className}
            sizes={tiles[index].sizes}
          />
        ))}
      </ul>
    </div>
  );
}
