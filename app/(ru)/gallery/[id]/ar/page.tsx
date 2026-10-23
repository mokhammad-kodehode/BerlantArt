import { redirect } from "next/navigation";

import { roomPageUrl } from "@/lib/ar-links";
import { localePath } from "@/lib/i18n/config";
import { isRoomOn, parseRoomOptions } from "@/lib/room-options";

/**
 * Камера была здесь отдельной страницей до 22.10.2026, теперь это кнопка
 * в примерочной (ARCHITECTURE.md, примерка через камеру). Старые ссылки —
 * их пересылали в WhatsApp — открывают примерочную с той же рамой, а пока
 * она скрыта (isRoomOn) — саму работу: камера там открывается значком.
 */
export default async function Page({ params, searchParams }: PageProps<"/gallery/[id]/ar">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  redirect(
    isRoomOn ? roomPageUrl(id, parseRoomOptions(query), "ru") : localePath("ru", `/gallery/${id}`),
  );
}
