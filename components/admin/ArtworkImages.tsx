"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import {
  attachImage,
  makePrimary,
  removeImage,
  reorderImage,
  requestUpload,
  saveImageAlt,
} from "@/lib/actions/images";
import { prepareImage } from "@/lib/prepare-image";
import {
  acceptAttribute,
  checkSource,
  checkUpload,
  formatBytes,
  maxFileBytes,
  maxLongSide,
} from "@/lib/upload-limits";

/**
 * Фотографии работы: загрузка, порядок, главная, удаление.
 *
 * Клиентский компонент — иначе не показать ход заливки и не дать выбрать
 * файл. Адреса картинок приходят готовыми из страницы: собрать их здесь
 * значило бы притащить в браузер слой доступа к базе.
 *
 * Файл летит в хранилище **напрямую из браузера**, минуя наш сервер:
 * у запроса к серверу лимит 1 МБ, а исходник с телефона весит 3–12 МБ.
 * Сервер только подписывает адрес и потом проверяет, что долетело.
 *
 * Перед заливкой снимок пережимается здесь же, в браузере (Э5-2):
 * до 2500px, в WebP, не тяжелее 1 МБ — см. `lib/prepare-image.ts`.
 */

/** Одно изображение в том виде, в каком его отдаёт страница. */
export type AdminImage = {
  id: string;
  alt: string;
  isPrimary: boolean;
  /** Готовый адрес или `undefined`, если домен хранилища не задан. */
  src: string | undefined;
};

/** Файл в процессе: сначала сжимается, потом заливается. */
type Upload = { id: number; name: string; percent: number; isCompressing: boolean };

/**
 * Кладёт файл по подписанному адресу, сообщая о ходе.
 *
 * Через `XMLHttpRequest`, а не `fetch`: у современного `fetch` нет события
 * прогресса отправки. Фотография в 4 МБ на слабом канале грузится
 * полминуты, и молчащая всё это время форма выглядит сломанной.
 *
 * `Content-Type` обязан совпасть с тем, под который выдана подпись, —
 * он входит в неё, и при расхождении хранилище откажет.
 */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Хранилище отказало, код ${request.status}.`));
    });

    request.addEventListener("error", () =>
      reject(new Error("Не удалось связаться с хранилищем. Проверь интернет и попробуй снова.")),
    );

    request.addEventListener("abort", () => reject(new Error("Загрузка прервана.")));

    request.send(file);
  });
}

export function ArtworkImages({
  artworkId,
  artworkTitle,
  images,
}: {
  artworkId: string;
  artworkTitle: string;
  images: AdminImage[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const nextUploadId = useRef(0);

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /** Перерисовывает страницу свежими данными после изменения.
   * Сам список приходит с сервера, поэтому своей копии мы не держим —
   * копия рано или поздно разошлась бы с базой. */
  const refresh = () => startTransition(() => router.refresh());

  async function upload(source: File) {
    // Быстрый отказ до сжатия. Настоящая проверка всё равно на сервере —
    // этой верить нельзя, она про удобство.
    const refusal = checkSource(source);
    if (refusal !== null) {
      setError(refusal);
      return;
    }

    const id = nextUploadId.current++;
    setUploads((current) => [
      ...current,
      { id, name: source.name, percent: 0, isCompressing: true },
    ]);

    try {
      const file = await prepareImage(source);

      // Сжатие обязано уложиться в лимит само, так что сработать эта
      // проверка не должна. Стоит ради честного текста: без неё отказ
      // пришёл бы от сервера уже после напрасной заливки.
      const oversize = checkUpload(file);
      if (oversize !== null) throw new Error(oversize);

      setUploads((current) =>
        current.map((u) => (u.id === id ? { ...u, isCompressing: false } : u)),
      );

      const signed = await requestUpload({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      if (!signed.ok) throw new Error(signed.error);

      await putWithProgress(signed.target.url, file, (percent) =>
        setUploads((current) => current.map((u) => (u.id === id ? { ...u, percent } : u))),
      );

      // Подпись под фотографией по умолчанию — название работы. Для второй
      // и третьей фотографии той же картины это плохая подпись, поэтому
      // рядом есть поле для правки.
      const attached = await attachImage({ artworkId, key: signed.target.key, alt: artworkTitle });
      if (!attached.ok) throw new Error(attached.error);

      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить файл.");
    } finally {
      setUploads((current) => current.filter((u) => u.id !== id));
    }
  }

  async function pickFiles(files: FileList | null) {
    if (files === null) return;
    setError(null);

    // По очереди, а не через Promise.all: Next отправляет действия
    // на сервер одно за другим, и параллельный запуск только запутал бы
    // показания прогресса, не ускорив ничего.
    for (const file of Array.from(files)) await upload(file);

    if (fileInput.current !== null) fileInput.current.value = "";
  }

  /** Обёртка над действием: гасит прежнюю ошибку, показывает новую,
   * обновляет страницу при успехе. */
  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    const result = await action();

    if (result.ok) refresh();
    else setError(result.error);
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Фотографии</h2>
        <p className="text-ink/75 text-sm">
          JPEG, PNG или WebP. Фото уменьшается до {maxLongSide}px и сохраняется в WebP до{" "}
          {formatBytes(maxFileBytes)}. Первая становится главной.
        </p>
      </div>

      <input
        ref={fileInput}
        id="photo-input"
        type="file"
        accept={acceptAttribute}
        multiple
        className="sr-only"
        onChange={(event) => void pickFiles(event.target.files)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={uploads.length > 0}
        >
          {uploads.length > 0 ? "Загружаем…" : "Выбрать фотографии"}
        </Button>

        {images.length === 0 && uploads.length === 0 && (
          <p className="text-ink/75 text-sm">Пока ни одной — в галерее работа покажется пустой.</p>
        )}
      </div>

      {uploads.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {uploads.map((upload) => (
            <li key={upload.id} className="text-sm">
              <div className="mb-1 flex justify-between gap-4">
                <span className="truncate">{upload.name}</span>
                <span className="text-ink/75 tabular-nums">
                  {upload.isCompressing ? "Сжимаем…" : `${upload.percent}%`}
                </span>
              </div>
              {/* Полоса прогресса — элемент progress, а не крашеный div:
                  скринридер зачитывает его сам, без подпорок. Пока идёт
                  сжатие, доля неизвестна — полоса без value бегает
                  «неопределённой», а не стоит на нуле, как зависшая. */}
              <progress
                className="progress"
                value={upload.isCompressing ? undefined : upload.percent}
                max={100}
              >
                {upload.percent}%
              </progress>
            </li>
          ))}
        </ul>
      )}

      {error !== null && (
        <p role="alert" className="field-error mt-4">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {images.map((image, index) => (
            <ImageRow
              key={image.id}
              image={image}
              index={index}
              total={images.length}
              artworkId={artworkId}
              busy={isPending}
              run={run}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ImageRow({
  image,
  index,
  total,
  artworkId,
  busy,
  run,
}: {
  image: AdminImage;
  index: number;
  total: number;
  artworkId: string;
  busy: boolean;
  run: (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => Promise<void>;
}) {
  const [alt, setAlt] = useState(image.alt);
  // Удаление необратимо, поэтому в два нажатия. Отдельный диалог завёл бы
  // разметку и ловушку фокуса ради одной кнопки — для работы целиком он
  // появится в Э6-4, там цена ошибки выше.
  const [confirming, setConfirming] = useState(false);

  const altChanged = alt.trim() !== image.alt && alt.trim() !== "";

  return (
    <li className="border-divider flex flex-wrap items-start gap-4 rounded-[14px] border p-3">
      <div className="bg-surface relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px]">
        {image.src === undefined ? (
          <span className="text-ink/75 flex h-full items-center justify-center text-xs">
            нет адреса
          </span>
        ) : (
          <Image src={image.src} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>

      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink/75 text-xs tabular-nums">{index + 1}</span>
          {image.isPrimary && <span className="tag tag-outline text-xs">Главная</span>}
        </div>

        <label className="text-ink/75 text-xs" htmlFor={`alt-${image.id}`}>
          Подпись для незрячих
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`alt-${image.id}`}
            className="input flex-1"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
          {altChanged && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => saveImageAlt(image.id, alt))}
            >
              Сохранить подпись
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          aria-label="Переместить выше"
          disabled={busy || index === 0}
          onClick={() => void run(() => reorderImage(image.id, "up"))}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Переместить ниже"
          disabled={busy || index === total - 1}
          onClick={() => void run(() => reorderImage(image.id, "down"))}
        >
          ↓
        </Button>

        {!image.isPrimary && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => void run(() => makePrimary(artworkId, image.id))}
          >
            Сделать главной
          </Button>
        )}

        {confirming ? (
          <>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                void run(() => removeImage(image.id));
              }}
            >
              Точно удалить
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Отмена
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirming(true)}>
            Удалить
          </Button>
        )}
      </div>
    </li>
  );
}
