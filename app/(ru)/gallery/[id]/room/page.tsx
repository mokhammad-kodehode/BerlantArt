import type { Metadata } from "next";

import { RoomPage, roomMetadata } from "@/components/pages/RoomPage";

export async function generateMetadata({
  params,
}: PageProps<"/gallery/[id]/room">): Promise<Metadata> {
  const { id } = await params;
  return roomMetadata("ru", id);
}

export default async function Page({ params, searchParams }: PageProps<"/gallery/[id]/room">) {
  const { id } = await params;
  return <RoomPage lang="ru" id={id} searchParams={searchParams} />;
}
