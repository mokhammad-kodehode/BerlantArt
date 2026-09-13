"use server";

import { redirect } from "next/navigation";

import {
  parseArtworkForm,
  readArtworkForm,
  type ArtworkFieldErrors,
  type ArtworkFormRaw,
} from "@/lib/artwork-form";
import { createArtwork, updateArtwork } from "@/lib/artworks";
import { assertAdmin } from "@/lib/auth";
import { revalidateAdminArtwork, revalidatePublicPages } from "@/lib/revalidate";

/**
 * Изменение работ из админки.
 *
 * Каждый экшен начинается с `assertAdmin()`, и это не перестраховка:
 * Server Action — публичный POST к странице, дойти до него можно мимо
 * интерфейса. Документация Next говорит об этом прямо, и отрисованная
 * на закрытой странице форма защитой не считается.
 *
 * Запросов к Prisma здесь нет — они в `lib/artworks.ts`. Экшен делает
 * три вещи: проверяет права, проверяет данные, сбрасывает кеш страниц.
 */

export type ArtworkFormState = {
  /** Ошибки по полям. Пусто, если разбор прошёл. */
  errors?: ArtworkFieldErrors;
  /** Что человек набрал — возвращается в форму, чтобы правка не потерялась. */
  values?: ArtworkFormRaw;
  /** Показать «сохранено» под формой редактирования. */
  saved?: boolean;
  /** Ошибка, не относящаяся к конкретному полю. */
  error?: string;
};

/**
 * Создаёт или обновляет работу.
 *
 * Один экшен на оба случая: поля, проверки и сообщения об ошибках у них
 * совпадают полностью, а различие — в одной строке. Два почти одинаковых
 * экшена разошлись бы при первой же правке схемы.
 *
 * Идентификатор приходит скрытым полем формы. Это ссылка на строку,
 * а не её содержимое: остальные поля работы мы перечитываем не у клиента,
 * а из того, что он прислал в форме, и записываем целиком. Подделать
 * `id` можно — но аккаунт один, и любая работа принадлежит ему, так что
 * проверять владение нечем и незачем.
 */
export async function saveArtwork(
  _state: ArtworkFormState,
  formData: FormData,
): Promise<ArtworkFormState> {
  await assertAdmin();

  const raw = readArtworkForm(formData);
  const parsed = parseArtworkForm(raw);

  if (!parsed.ok) return { errors: parsed.errors, values: raw };

  const idField = formData.get("id");
  const id = typeof idField === "string" && idField !== "" ? idField : null;

  if (id === null) {
    const created = await createArtwork(parsed.data);
    revalidatePublicPages();

    // Переход на страницу редактирования, а не «создано, введите ещё раз»:
    // следующий шаг после создания — добавить фотографии, а они живут там.
    // redirect бросает исключение внутри, поэтому стоит последним.
    redirect(`/admin/artworks/${created}`);
  }

  const updated = await updateArtwork(id, parsed.data);

  if (!updated) {
    return {
      values: raw,
      error: "Работа не найдена — возможно, её удалили в другом окне.",
    };
  }

  revalidateAdminArtwork(id);
  revalidatePublicPages();

  return { values: raw, saved: true };
}
