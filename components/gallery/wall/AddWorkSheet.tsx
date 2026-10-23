import { useEffect, useState } from "react";

import { ArtworkImage } from "@/components/ui/ArtworkImage";
import { wallPhotoUrl } from "@/lib/ar-links";
import { fetchArtworkFeed } from "@/lib/artwork-thumbs";
import { useDictionary } from "@/lib/i18n/client";
import { canvasCmText } from "@/lib/room-options";
import type { WallWork } from "@/lib/wall-scene";

/** Картина в списке «Добавить»: для стены и миниатюра для глаз. */
type Choice = WallWork & { thumb: string };

/**
 * «+ Картина» на фото стены (TICKETS-primerka.md, П-3): работы, у которых
 * указан размер, — без него картину на стене в настоящую величину не
 * показать. Список — тот же общий файл, что у ленты (/api/artwork-thumbs):
 * браузер его уже скачал на странице работы, второго запроса в базу нет.
 */
export function AddWorkSheet({
  onWall,
  onPick,
  onClose,
}: {
  /** Что уже висит — у них пометка «на стене». */
  onWall: ReadonlySet<string>;
  onPick: (work: WallWork) => void;
  onClose: () => void;
}) {
  const t = useDictionary().room;
  const [works, setWorks] = useState<Choice[] | null>(null);

  useEffect(() => {
    let isActive = true;
    fetchArtworkFeed()
      .then((list) => {
        if (!isActive) return;
        setWorks(
          list.flatMap((item) =>
            item.canvas && item.src
              ? [
                  {
                    id: item.id,
                    title: item.title,
                    canvas: item.canvas,
                    // Со своего адреса — иначе снимок не отдать (lib/ar-links.ts).
                    photoUrl: item.arVersion ? wallPhotoUrl(item.id, item.arVersion) : item.src,
                    thumb: item.src,
                  },
                ]
              : [],
          ),
        );
      })
      .catch((error: unknown) => {
        // Без списка добавить нечего — лист остаётся с надписью «Загружаем».
        // Причина — в консоль, чтобы её найти.
        console.error(error);
      });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="wall-sheet" role="dialog" aria-modal="false" aria-labelledby="wall-add-title">
      <div className="wall-sheet-head">
        <h2 id="wall-add-title" className="wall-sheet-title">
          {t.wall.addTitle}
        </h2>
        <button type="button" className="wall-close" onClick={onClose} aria-label={t.wall.edit}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <p className="wall-sheet-text">{t.wall.addText}</p>
      {works === null ? (
        <p className="wall-sheet-text">{t.wall.loading}</p>
      ) : (
        <ul className="wall-works">
          {works.map((work) => (
            <li key={work.id}>
              <button type="button" className="wall-work" onClick={() => onPick(work)}>
                <span className="wall-work-photo">
                  <ArtworkImage src={work.thumb} alt="" sizes="120px" />
                  {onWall.has(work.id) && <span className="wall-work-mark">{t.wall.onWall}</span>}
                </span>
                <span className="wall-work-title">{work.title}</span>
                <span className="wall-work-size">{canvasCmText(work.canvas, t.cm)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
