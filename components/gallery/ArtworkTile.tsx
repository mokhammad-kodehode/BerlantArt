import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { Tag } from "@/components/ui/Tag";
import { artworkCaption, primaryImageUrl, type ArtworkWithImages } from "@/lib/artworks";
import { cn } from "@/lib/cn";

/**
 * Плитка работы на «стене» галереи.
 *
 * Пока живёт здесь, а не в components/ui/: второй потребитель появится
 * в Э4-5, в блоке «другие работы», — тогда и переедет.
 *
 * Ссылки на страницу работы у плитки нет намеренно: маршрут /gallery/[id]
 * появится только в Э4-5, а ссылка в несуществующий адрес — это 404.
 */

/** Подпись статуса словом. Серая карточка сама по себе ничего не сообщает. */
const statusLabel = {
  AVAILABLE: null,
  RESERVED: "Забронирована",
  SOLD: "Продана",
} as const;

/**
 * Размер плитки в сетке.
 *
 * Формула из макета: каждая пятая работа занимает две строки, каждая
 * седьмая начиная с четвёртой — два столбца. Стена получается неровной,
 * как настоящая развеска, и при этом порядок не зависит от случайности:
 * одна и та же работа всегда встаёт на одно и то же место.
 *
 * Широкая плитка только с трёх столбцов: на телефоне их два, и растянутая
 * на всю ширину работа выбивалась бы из ряда.
 */
function spanClasses(index: number): string {
  return cn(index % 5 === 0 && "row-span-2", index % 7 === 3 && "md:col-span-2");
}

export function ArtworkTile({ work, index }: { work: ArtworkWithImages; index: number }) {
  const label = statusLabel[work.status];
  const caption = artworkCaption(work);

  return (
    <li className={cn("wall-tile list-none", spanClasses(index))}>
      <div className="washed absolute inset-0">
        {/* Ширина плитки: половина экрана на телефоне, четверть колонки
            в 1200px на десктопе — отсюда и значения sizes. */}
        <ArtworkImage
          src={primaryImageUrl(work)}
          alt={work.title}
          sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 285px"
        />
      </div>

      {label && (
        <Tag
          tone={work.status === "SOLD" ? "neutral" : "accent"}
          className="absolute top-3.5 left-3.5"
        >
          {label}
        </Tag>
      )}

      <div className="wall-caption absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(20_18_17/0.85)] to-transparent p-4">
        <p className="m-0 text-[14px] tracking-[0.02em] text-neutral-100">{work.title}</p>
        {caption && <p className="mt-0.5 mb-0 text-[11.5px] text-neutral-100/70">{caption}</p>}
      </div>
    </li>
  );
}
