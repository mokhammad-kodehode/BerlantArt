import type { Metadata } from "next";

import { CameraPage, cameraMetadata } from "@/components/pages/CameraPage";

export async function generateMetadata({
  params,
}: PageProps<"/gallery/[id]/ar">): Promise<Metadata> {
  const { id } = await params;
  return cameraMetadata("ru", id);
}

export default async function Page({ params, searchParams }: PageProps<"/gallery/[id]/ar">) {
  const { id } = await params;
  return <CameraPage lang="ru" id={id} searchParams={searchParams} />;
}
