import type { Metadata } from "next";

import { RoomPage, roomMetadata } from "@/components/pages/RoomPage";

/**
 * Готовится при первом заходе и дальше отдаётся готовой (TICKETS-primerka.md,
 * решение 4): пустой список — ни одной примерочной при сборке, все по
 * запросу. Без него страница с параметром в пути собиралась бы на каждый
 * заход. Сбрасывается вместе со страницей работы (lib/revalidate.ts);
 * раз в сутки — подстраховка, как у неё.
 */
export function generateStaticParams(): { id: string }[] {
  return [];
}

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: PageProps<"/en/gallery/[id]/room">): Promise<Metadata> {
  const { id } = await params;
  return roomMetadata("en", id);
}

export default async function Page({ params }: PageProps<"/en/gallery/[id]/room">) {
  const { id } = await params;
  return <RoomPage lang="en" id={id} />;
}
