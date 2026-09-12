import { ArtworkTile } from "@/components/ui/ArtworkTile";
import type { ArtworkWithImages } from "@/lib/artworks";
import { cn } from "@/lib/cn";
import { collageLayout } from "@/lib/collage";

/**
 * Стена-коллаж: работы разного размера, плотно и без дыр.
 *
 * Вынесено из страницы галереи, когда появился второй потребитель —
 * главная: там этой же стеной заменили ленту «Из мастерской». Абстракция
 * заведена именно поэтому, а не «на будущее»
 * ([architecture.md](../../.ai/rules/architecture.md)).
 *
 * Высоту задаёт вызывающая сторона через `className`, и это существенно:
 * строки сетки — `1fr`, поэтому свободная высота контейнера уходит им.
 * В галерее коллаж получает `flex-1` и занимает весь экран, на главной —
 * `min-h` секции. Без заданной высоты строки сожмутся до минимума.
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
    <ul
      className={cn(
        "wall m-0 grid list-none auto-rows-[minmax(150px,1fr)] grid-cols-2 gap-2.5 p-0 md:auto-rows-[minmax(120px,1fr)] md:grid-cols-4",
        className,
      )}
    >
      {works.map((work, index) => (
        <ArtworkTile
          key={work.id}
          work={work}
          className={tiles[index].className}
          sizes={tiles[index].sizes}
        />
      ))}
    </ul>
  );
}
