import { validateBytes } from "gltf-validator";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildPaintingScene } from "@/lib/ar-model";
import { buildGlb } from "@/lib/glb";
import { roomFrames } from "@/lib/room-options";

const canvas = { widthM: 0.4, heightM: 0.5 };

async function photo(): Promise<Uint8Array> {
  const bytes = await sharp({
    create: { width: 40, height: 50, channels: 3, background: "#6a8a5a" },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(bytes);
}

function readJson(glb: Uint8Array) {
  const view = new DataView(glb.buffer, glb.byteOffset);
  const length = view.getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + length)).trimEnd());
}

describe("buildGlb", () => {
  it("пишет заголовок и блоки по спецификации", async () => {
    const glb = buildGlb(
      buildPaintingScene({ canvas, frame: "classic", finish: "gold" }),
      await photo(),
    );
    const view = new DataView(glb.buffer, glb.byteOffset);

    expect(new TextDecoder().decode(glb.subarray(0, 4))).toBe("glTF");
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(glb.length);

    const jsonLength = view.getUint32(12, true);
    expect(jsonLength % 4).toBe(0);
    expect(view.getUint32(20 + jsonLength, true) % 4).toBe(0);
    expect(glb.length % 4).toBe(0);
  });

  it("проходит валидатор Khronos при любой раме", async () => {
    const jpeg = await photo();
    for (const { id, finishes } of roomFrames) {
      const scene = buildPaintingScene({ canvas, frame: id, finish: finishes[0] ?? "gold" });
      const report = await validateBytes(buildGlb(scene, jpeg));

      // Сообщения — в подпись, чтобы по упавшему тесту было видно, что не так.
      const problems = report.issues.messages.filter((message) => message.severity <= 1);
      expect(problems, id).toEqual([]);
    }
  });

  it("границы модели — те же, что у сцены", async () => {
    const scene = buildPaintingScene({ canvas, frame: "baroque", finish: "old-gold" });
    const gltf = readJson(buildGlb(scene, await photo()));

    const [minX, , minZ] = scene.min;
    const [maxX, , maxZ] = scene.max;
    const accessors: { min?: number[]; max?: number[] }[] = gltf.accessors;
    const boxes = accessors.filter((accessor) => accessor.min !== undefined);

    expect(Math.min(...boxes.map((box) => box.min?.[0] ?? 0))).toBeCloseTo(minX, 6);
    expect(Math.max(...boxes.map((box) => box.max?.[0] ?? 0))).toBeCloseTo(maxX, 6);
    expect(Math.min(...boxes.map((box) => box.min?.[2] ?? 0))).toBeCloseTo(minZ, 6);
    expect(Math.max(...boxes.map((box) => box.max?.[2] ?? 0))).toBeCloseTo(maxZ, 6);
  });

  it("кладёт фото внутрь как есть", async () => {
    const jpeg = await photo();
    const glb = buildGlb(buildPaintingScene({ canvas, frame: "none", finish: "gold" }), jpeg);
    const gltf = readJson(glb);

    const view = gltf.bufferViews[gltf.images[0].bufferView];
    const binStart = 20 + new DataView(glb.buffer, glb.byteOffset).getUint32(12, true) + 8;
    expect(gltf.images[0].mimeType).toBe("image/jpeg");
    expect(
      glb.subarray(binStart + view.byteOffset, binStart + view.byteOffset + view.byteLength),
    ).toEqual(jpeg);
  });
});
