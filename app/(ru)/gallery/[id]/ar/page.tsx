import { redirect } from "next/navigation";

import { roomPageUrl } from "@/lib/ar-links";
import { parseFrameChoice } from "@/lib/room-options";

/**
 * Камера была здесь отдельной страницей до 22.10.2026, теперь это кнопка
 * в примерочной (TICKETS-primerka.md). Старые ссылки — их пересылали
 * в WhatsApp — открывают примерочную с той же рамой.
 */
export default async function Page({ params, searchParams }: PageProps<"/gallery/[id]/ar">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  redirect(roomPageUrl(id, parseFrameChoice(query), "ru"));
}
