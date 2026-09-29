import type { ArScene } from "@/lib/ar-model";

/**
 * Сцена картины в GLB — файл для Scene Viewer на Android (AR-2).
 *
 * GLB — это glTF 2.0 одним файлом: заголовок, блок JSON с описанием сцены
 * и двоичный блок с вершинами и фотографией. Пишем сами, без библиотеки:
 * формат простой, а готовая закрыла бы только Android (решение в
 * TICKETS-ar.md). Правильность проверяет валидатор Khronos в тестах.
 *
 * Фото — только JPEG: внутрь модели телефоны берут JPEG и PNG, а не WebP,
 * в котором фото лежат в хранилище. Перекодирует тот, кто зовёт (AR-3).
 */

const magic = 0x46546c67; // «glTF»
const chunkJson = 0x4e4f534a; // «JSON»
const chunkBin = 0x004e4942; // «BIN\0»

const float = 5126;
const unsignedShort = 5123;
const unsignedInt = 5125;
const arrayBuffer = 34962;
const elementArrayBuffer = 34963;
const triangles = 4;

type BufferView = { buffer: 0; byteOffset: number; byteLength: number; target?: number };
type Accessor = {
  bufferView: number;
  componentType: number;
  count: number;
  type: "SCALAR" | "VEC2" | "VEC3";
  min?: number[];
  max?: number[];
};

/** Двоичный блок: куски подряд, каждый с границы в 4 байта, как требует glTF. */
class BinaryChunk {
  private readonly pieces: Uint8Array[] = [];
  private length = 0;
  readonly views: BufferView[] = [];

  add(bytes: Uint8Array, target?: number): number {
    const padding = (4 - (this.length % 4)) % 4;
    if (padding > 0) this.pieces.push(new Uint8Array(padding));
    this.length += padding;

    this.views.push({ buffer: 0, byteOffset: this.length, byteLength: bytes.length, target });
    this.pieces.push(bytes);
    this.length += bytes.length;
    return this.views.length - 1;
  }

  bytes(): Uint8Array {
    return concat(this.pieces);
  }
}

export function buildGlb(scene: ArScene, photoJpeg: Uint8Array): Uint8Array<ArrayBuffer> {
  const binary = new BinaryChunk();
  const accessors: Accessor[] = [];

  const addAccessor = (accessor: Accessor): number => accessors.push(accessor) - 1;
  const floats = (values: number[]) => new Uint8Array(new Float32Array(values).buffer);

  const hasPhoto = scene.parts.some((part) => part.material.hasPhoto);
  const photoView = hasPhoto ? binary.add(photoJpeg) : undefined;

  const primitives = scene.parts.map((part, index) => {
    const count = part.positions.length / 3;
    // Границы — по уже округлённым до float32 числам: валидатор сверяет
    // их с тем, что лежит в файле, а не с исходными float64.
    const positions = new Float32Array(part.positions);
    const axis = (index: number) => positions.filter((_, i) => i % 3 === index);
    const min = [0, 1, 2].map((index) => Math.min(...axis(index)));
    const max = [0, 1, 2].map((index) => Math.max(...axis(index)));

    const attributes: Record<string, number> = {
      POSITION: addAccessor({
        bufferView: binary.add(new Uint8Array(positions.buffer), arrayBuffer),
        componentType: float,
        count,
        type: "VEC3",
        min,
        max,
      }),
      NORMAL: addAccessor({
        bufferView: binary.add(floats(part.normals), arrayBuffer),
        componentType: float,
        count,
        type: "VEC3",
      }),
    };
    if (part.uvs !== undefined) {
      attributes.TEXCOORD_0 = addAccessor({
        bufferView: binary.add(floats(part.uvs), arrayBuffer),
        componentType: float,
        count,
        type: "VEC2",
      });
    }

    const isShort = count <= 0xffff;
    const indexBytes = isShort
      ? new Uint8Array(new Uint16Array(part.indices).buffer)
      : new Uint8Array(new Uint32Array(part.indices).buffer);
    const indices = addAccessor({
      bufferView: binary.add(indexBytes, elementArrayBuffer),
      componentType: isShort ? unsignedShort : unsignedInt,
      count: part.indices.length,
      type: "SCALAR",
    });

    return { attributes, indices, material: index, mode: triangles };
  });

  const materials = scene.parts.map(({ material }) => ({
    name: material.name,
    pbrMetallicRoughness: {
      baseColorFactor: [...material.color, 1],
      metallicFactor: material.metallic,
      roughnessFactor: material.roughness,
      ...(material.hasPhoto ? { baseColorTexture: { index: 0 } } : {}),
    },
  }));

  const gltf = {
    asset: { version: "2.0", generator: "berlant-art" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "Painting", mesh: 0 }],
    meshes: [{ name: "Painting", primitives }],
    materials,
    ...(photoView === undefined
      ? {}
      : {
          images: [{ bufferView: photoView, mimeType: "image/jpeg" }],
          // Фото растягивается ровно на лицо — повторять его не нужно.
          samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
          textures: [{ source: 0, sampler: 0 }],
        }),
    accessors,
    bufferViews: binary.views,
    buffers: [{ byteLength: 0 }],
  };

  const bin = binary.bytes();
  gltf.buffers[0].byteLength = bin.length;

  // JSON добивается пробелами, двоичный блок — нулями: так велит спецификация.
  const json = padTo4(new TextEncoder().encode(JSON.stringify(gltf)), 0x20);
  const body = padTo4(bin, 0);

  const header = new DataView(new ArrayBuffer(12));
  const total = 12 + 8 + json.length + 8 + body.length;
  header.setUint32(0, magic, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, total, true);

  return concat([
    new Uint8Array(header.buffer),
    chunkHeader(json.length, chunkJson),
    json,
    chunkHeader(body.length, chunkBin),
    body,
  ]);
}

function chunkHeader(length: number, type: number): Uint8Array {
  const view = new DataView(new ArrayBuffer(8));
  view.setUint32(0, length, true);
  view.setUint32(4, type, true);
  return new Uint8Array(view.buffer);
}

function padTo4(bytes: Uint8Array, filler: number): Uint8Array {
  const padding = (4 - (bytes.length % 4)) % 4;
  if (padding === 0) return bytes;
  return concat([bytes, new Uint8Array(padding).fill(filler)]);
}

function concat(pieces: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(pieces.reduce((sum, piece) => sum + piece.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    result.set(piece, offset);
    offset += piece.length;
  }
  return result;
}
