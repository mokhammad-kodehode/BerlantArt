import { redirect } from "next/navigation";

import { roomPageUrl } from "@/lib/ar-links";
import { parseRoomOptions } from "@/lib/room-options";

/**
 * Камера была здесь отдельной страницей до 22.10.2026, теперь это кнопка
 * в примерочной (ARCHITECTURE.md, примерка через камеру). Старые ссылки —
 * их пересылали в WhatsApp — открывают примерочную с той же рамой.
 */
export default async function Page({ params, searchParams }: PageProps<"/en/gallery/[id]/ar">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  redirect(roomPageUrl(id, parseRoomOptions(query), "en"));
}
