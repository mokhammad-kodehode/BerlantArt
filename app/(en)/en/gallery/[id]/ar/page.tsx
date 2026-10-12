import type { Metadata } from "next";

import { CameraPage, cameraMetadata } from "@/components/pages/CameraPage";

export async function generateMetadata({
  params,
}: PageProps<"/en/gallery/[id]/ar">): Promise<Metadata> {
  const { id } = await params;
  return cameraMetadata("en", id);
}

export default async function Page({ params, searchParams }: PageProps<"/en/gallery/[id]/ar">) {
  const { id } = await params;
  return <CameraPage lang="en" id={id} searchParams={searchParams} />;
}
