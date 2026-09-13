"use server";

import { z } from "zod";

import {
  addImage,
  artworkIdOfImage,
  deleteImage,
  moveImage,
  setPrimaryImage,
  updateImageAlt,
  type ImageDirection,
} from "@/lib/artworks";
import { assertAdmin } from "@/lib/auth";
import { createUploadUrl, deleteObject, headObject, type UploadTarget } from "@/lib/r2";
import { revalidateAdminArtwork, revalidatePublicPages } from "@/lib/revalidate";
import { checkUpload, isOwnObjectKey } from "@/lib/upload-limits";

/**
 * Фотографии работ: подпись загрузки, привязка к работе, порядок,
 * удаление.
 *
 * Каждый экшен начинается с `assertAdmin()`. Это не перестраховка поверх
 * закрытой страницы: Server Action — публичный POST, и без проверки
 * подписывающий экшен превратился бы в разрешение писать в наш бакет
 * кому угодно.
 */

/** Что вернулось из действия. Текст ошибки предназначен человеку
 * и показывается как есть. */
export type ImageResult = { ok: true } | { ok: false; error: string };

const idSchema = z.string().min(1).max(64);

/**
 * Выдаёт разовую ссылку для заливки одного файла.
 *
 * Ни работа, ни запись в базе здесь не трогаются: пока файл не долетел,
 * привязывать нечего. Запись заводит `attachImage` — уже после того,
 * как хранилище подтвердит, что объект на месте.
 */
export async function requestUpload(input: {
  fileName: string;
  contentType: string;
  size: number;
}): Promise<{ ok: true; target: UploadTarget } | { ok: false; error: string }> {
  await assertAdmin();

  const parsed = z
    .object({
      fileName: z.string().min(1).max(300),
      contentType: z.string(),
      size: z.number().int(),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false, error: "Не удалось прочитать сведения о файле." };

  const refusal = checkUpload({ type: parsed.data.contentType, size: parsed.data.size });
  if (refusal !== null) return { ok: false, error: refusal };

  return { ok: true, target: await createUploadUrl(parsed.data) };
}

/**
 * Заводит запись об изображении после заливки.
 *
 * **Ключу из браузера здесь не верят, и это главное в функции.** Браузер
 * сообщает, по какому ключу он залил файл, — но прислать он может любой:
 * ключ, по которому ничего не заливалось, или чужой объект. Поэтому:
 *
 * 1. ключ обязан совпасть с формой, которую мы выдаём сами;
 * 2. у хранилища спрашивается, что там лежит на самом деле;
 * 3. фактические тип и вес сверяются с ограничениями — заявленному весу
 *    при подписи верить было нельзя, закрепить его в подписи невозможно.
 *
 * Не сошлось — объект удаляется, записи не появляется. Иначе в бакете
 * копился бы платный мусор, а в базе — строки без картинки.
 */
export async function attachImage(input: {
  artworkId: string;
  key: string;
  alt: string;
}): Promise<ImageResult> {
  await assertAdmin();

  const parsed = z
    .object({
      artworkId: idSchema,
      key: z.string().refine(isOwnObjectKey, { message: "Ключ файла не похож на выданный нами." }),
      alt: z.string().trim().min(1).max(300),
    })
    .safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные." };
  }

  const { artworkId, key, alt } = parsed.data;

  const stored = await headObject(key);
  if (stored === null) {
    return { ok: false, error: "Файл не найден в хранилище — возможно, загрузка оборвалась." };
  }

  const refusal = checkUpload({ type: stored.contentType, size: stored.size });
  if (refusal !== null) {
    await deleteObject(key);
    return { ok: false, error: refusal };
  }

  if (!(await addImage({ artworkId, key, alt }))) {
    // Работы нет — файл уже лежит в бакете и никому не нужен.
    await deleteObject(key);
    return { ok: false, error: "Работа не найдена — возможно, её удалили в другом окне." };
  }

  revalidateAdminArtwork(artworkId);
  revalidatePublicPages();

  return { ok: true };
}

/**
 * Убирает изображение вместе с файлом.
 *
 * Порядок именно такой: сначала запись, потом объект. Упади удаление
 * объекта — в бакете останется лишний файл, это стоит копеек и чинится.
 * В обратном порядке при сбое осталась бы запись, ведущая в никуда,
 * и работа показывала бы битую картинку.
 */
export async function removeImage(imageId: string): Promise<ImageResult> {
  await assertAdmin();

  if (!idSchema.safeParse(imageId).success) return { ok: false, error: "Некорректный запрос." };

  const artworkId = await artworkIdOfImage(imageId);
  const key = await deleteImage(imageId);

  if (key === null || artworkId === null) {
    return { ok: false, error: "Изображение уже удалено." };
  }

  // У пяти старых работ в поле лежит путь внутри public/, а не ключ
  // объекта. Файл из репозитория удалять нечем и незачем.
  if (isOwnObjectKey(key)) await deleteObject(key);

  revalidateAdminArtwork(artworkId);
  revalidatePublicPages();

  return { ok: true };
}

/** Двигает изображение в списке на одну позицию. */
export async function reorderImage(
  imageId: string,
  direction: ImageDirection,
): Promise<ImageResult> {
  await assertAdmin();

  const parsed = z
    .object({ imageId: idSchema, direction: z.enum(["up", "down"]) })
    .safeParse({ imageId, direction });

  if (!parsed.success) return { ok: false, error: "Некорректный запрос." };

  const artworkId = await artworkIdOfImage(imageId);
  if (artworkId === null) return { ok: false, error: "Изображение уже удалено." };

  if (!(await moveImage(imageId, parsed.data.direction))) {
    return { ok: false, error: "Двигать некуда." };
  }

  revalidateAdminArtwork(artworkId);
  revalidatePublicPages();

  return { ok: true };
}

/** Делает изображение главным — то есть ставит его первым в показе. */
export async function makePrimary(artworkId: string, imageId: string): Promise<ImageResult> {
  await assertAdmin();

  const parsed = z
    .object({ artworkId: idSchema, imageId: idSchema })
    .safeParse({ artworkId, imageId });

  if (!parsed.success) return { ok: false, error: "Некорректный запрос." };

  if (!(await setPrimaryImage(parsed.data.artworkId, parsed.data.imageId))) {
    return { ok: false, error: "Изображение не найдено." };
  }

  revalidateAdminArtwork(artworkId);
  revalidatePublicPages();

  return { ok: true };
}

/**
 * Меняет текст для скринридера.
 *
 * Пустым он быть не может: изображение работы не декоративное, и пустой
 * `alt` для незрячего означает, что картины на странице просто нет.
 */
export async function saveImageAlt(imageId: string, alt: string): Promise<ImageResult> {
  await assertAdmin();

  const parsed = z
    .object({
      imageId: idSchema,
      alt: z.string().trim().min(1, "Подпись не может быть пустой.").max(300),
    })
    .safeParse({ imageId, alt });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Некорректный запрос." };
  }

  const artworkId = await artworkIdOfImage(imageId);
  if (artworkId === null) return { ok: false, error: "Изображение уже удалено." };

  await updateImageAlt(imageId, parsed.data.alt);

  revalidateAdminArtwork(artworkId);
  revalidatePublicPages();

  return { ok: true };
}
