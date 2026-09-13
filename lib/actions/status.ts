"use server";

import { z } from "zod";

import { artworkStatuses } from "@/lib/artwork-form";
import { setArtworkStatus } from "@/lib/artworks";
import { assertAdmin } from "@/lib/auth";
import { revalidateAdminArtwork, revalidatePublicPages } from "@/lib/revalidate";

/**
 * Быстрая смена статуса прямо из списка работ.
 *
 * Отдельно от `saveArtwork` намеренно: тот записывает все девять полей,
 * и провести через него смену одного статуса значило бы отправлять
 * из таблицы всю форму — с риском затереть поля, которых в строке нет.
 */
export async function changeStatus(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = z
    .object({ id: z.string().min(1).max(64), status: z.enum(artworkStatuses) })
    .safeParse({ id: formData.get("id"), status: formData.get("status") });

  // Молча выходим, а не падаем: сюда можно попасть только подделав форму,
  // и рисовать человеку страницу ошибки не за что.
  if (!parsed.success) return;

  if (!(await setArtworkStatus(parsed.data.id, parsed.data.status))) return;

  revalidateAdminArtwork(parsed.data.id);
  revalidatePublicPages();
}
