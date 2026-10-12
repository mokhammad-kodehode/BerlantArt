import type { Metadata } from "next";

import { RoomPage, roomMetadata } from "@/components/pages/RoomPage";

export async function generateMetadata({
  params,
}: PageProps<"/en/gallery/[id]/room">): Promise<Metadata> {
  const { id } = await params;
  return roomMetadata("en", id);
}

export default async function Page({ params, searchParams }: PageProps<"/en/gallery/[id]/room">) {
  const { id } = await params;
  return <RoomPage lang="en" id={id} searchParams={searchParams} />;
}
