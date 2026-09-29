import { crc32 } from "node:zlib";

import { describe, expect, it } from "vitest";

import { buildPaintingScene } from "@/lib/ar-model";
import { buildUsdz } from "@/lib/usdz";

const canvas = { widthM: 0.4, heightM: 0.5 };
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 0xff, 0xd9]);

type Entry = { name: string; method: number; dataOffset: number; data: Uint8Array; crc: number };

/** Разбор zip по локальным заголовкам — так его читает Quick Look. */
function readEntries(zip: Uint8Array): Entry[] {
  const view = new DataView(zip.buffer, zip.byteOffset);
  const entries: Entry[] = [];
  let offset = 0;

  while (view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const crc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(zip.subarray(offset + 30, offset + 30 + nameLength));
    const dataOffset = offset + 30 + nameLength + extraLength;

    entries.push({
      name,
      method,
      dataOffset,
      data: zip.subarray(dataOffset, dataOffset + size),
      crc,
    });
    offset = dataOffset + size;
  }
  return entries;
}

function build(frame: "none" | "classic" = "classic") {
  const zip = buildUsdz(buildPaintingScene({ canvas, frame, finish: "gold" }), jpeg);
  const entries = readEntries(zip);
  return { zip, entries, usda: new TextDecoder().decode(entries[0].data) };
}

describe("buildUsdz", () => {
  it("первым лежит описание сцены, затем фото", () => {
    const { entries } = build();
    expect(entries.map((entry) => entry.name)).toEqual(["painting.usda", "photo.jpg"]);
    expect(entries[1].data).toEqual(jpeg);
  });

  it("zip без сжатия, данные с границы в 64 байта, суммы верны", () => {
    for (const entry of build().entries) {
      expect(entry.method, entry.name).toBe(0);
      expect(entry.dataOffset % 64, entry.name).toBe(0);
      expect(entry.crc, entry.name).toBe(crc32(entry.data));
    }
  });

  it("оглавление архива указывает на оба файла", () => {
    const { zip } = build();
    const view = new DataView(zip.buffer, zip.byteOffset);
    const end = zip.length - 22;

    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    expect(view.getUint32(end + 16, true) + view.getUint32(end + 12, true)).toBe(end);
  });

  it("картина повёрнута лицом из стены — по оси Y, как у стен в ARKit", () => {
    // Без поворота iPhone вешал картину полкой, лицом в пол.
    const { usda } = build();
    expect(usda).toMatch(
      /def Xform "Painting"\s*\{\s*float xformOp:rotateX = -90\s*uniform token\[\] xformOpOrder = \["xformOp:rotateX"\]/,
    );
    const painting = usda.indexOf('def Xform "Painting"');
    expect(usda.indexOf('def Mesh "Photo"')).toBeGreaterThan(painting);
  });

  it("в метрах, ось Y вверх, крепится к стене", () => {
    const { usda } = build();
    expect(usda).toMatch(/^#usda 1\.0/);
    expect(usda).toContain("metersPerUnit = 1");
    expect(usda).toContain('upAxis = "Y"');
    expect(usda).toContain('token preliminary:anchoring:type = "plane"');
    expect(usda).toContain('token preliminary:planeAnchoring:alignment = "vertical"');
  });

  it("ссылается на фото и привязывает материалы к каждой части", () => {
    const { usda } = build();
    expect(usda).toContain("@photo.jpg@");
    for (const name of ["Photo", "CanvasEdge", "Frame"]) {
      expect(usda).toContain(`def Mesh "${name}"`);
      expect(usda).toContain(`rel material:binding = </Root/Materials/${name}>`);
      expect(usda).toContain(`def Material "${name}"`);
    }
  });

  it("переворачивает координаты фото: в USD начало внизу", () => {
    // Лицо холста: первая вершина — левый нижний угол, у неё t = 0 в USD
    // (в glTF v = 1). Без переворота картина висела бы вверх ногами.
    const { usda } = build("none");
    expect(usda).toMatch(/texCoord2f\[\] primvars:st = \[\(0, 0\), \(1, 0\), \(1, 1\), \(0, 1\)\]/);
  });
});
