"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/Button";
import { removeArtwork } from "@/lib/actions/artworks";

/**
 * Удаление работы с подтверждением.
 *
 * Клиентский — из-за открытия и закрытия диалога, больше ни для чего.
 * Само удаление делает Server Action: обычная форма внутри диалога,
 * и без JavaScript она тоже отправится.
 *
 * Диалог — встроенный в браузер `<dialog>`, а не свой слой с затемнением.
 * В нём уже есть ловушка фокуса, закрытие по Esc, возврат фокуса на
 * кнопку после закрытия и правильная роль для скринридера. Написать это
 * вручную — двадцать строк, которые легко сделать хуже.
 *
 * Двухступенчатой кнопки, как у отдельной фотографии, здесь мало:
 * удаляется работа целиком со всеми файлами, и подтверждение обязано
 * назвать, что именно исчезнет.
 */
export function DeleteArtwork({
  artworkId,
  title,
  photoCount,
}: {
  artworkId: string;
  title: string;
  photoCount: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const photos =
    photoCount === 0
      ? "фотографий у неё нет"
      : photoCount === 1
        ? "вместе с одной фотографией"
        : `вместе с фотографиями (${photoCount})`;

  return (
    <>
      <Button type="button" variant="danger" onClick={() => dialog.current?.showModal()}>
        Удалить работу
      </Button>

      <dialog ref={dialog} className="dialog" aria-labelledby="delete-title">
        <div className="flex flex-col gap-4 p-6">
          <h2 id="delete-title" className="font-display text-xl">
            Удалить «{title}»?
          </h2>

          <p className="text-sm">
            Работа исчезнет с сайта навсегда, {photos}. Вернуть её будет нельзя — корзины на сайте
            нет.
          </p>

          {/* Названо прямо: чаще всего человеку нужно не это. Подсказка
              в момент решения полезнее, чем правило в инструкции. */}
          <p className="text-ink/55 text-sm">
            Если работа просто больше не продаётся — не удаляй её, а поставь статус «Продана». Она
            останется на сайте, и её историю будет видно.
          </p>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>
              Отмена
            </Button>

            <form action={removeArtwork}>
              <input type="hidden" name="id" value={artworkId} />
              <Button type="submit" variant="danger">
                Удалить навсегда
              </Button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
