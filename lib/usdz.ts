import { crc32 } from "node:zlib";

import type { ArMaterial, ArPart, ArScene } from "@/lib/ar-model";

/**
 * Сцена картины в USDZ — файл для AR Quick Look на iPhone (AR-2).
 *
 * USDZ — это zip без сжатия, где первым лежит описание сцены (здесь —
 * текстовый USDA), а следом фото. Apple требует, чтобы данные каждого
 * файла начинались с границы в 64 байта: телефон читает их прямо из
 * архива, не распаковывая. Своя упаковка — полсотни строк; библиотеки
 * для USDZ без three.js нет (решение в TICKETS-ar.md).
 *
 * Картина крепится к вертикальной плоскости — стене — через
 * `preliminary:planeAnchoring`: без этого Quick Look положит её на пол.
 */

const sceneFile = "painting.usda";
const photoFile = "photo.jpg";

export function buildUsdz(scene: ArScene, photoJpeg: Uint8Array): Uint8Array {
  return zipStored([
    { name: sceneFile, data: new TextEncoder().encode(usda(scene)) },
    { name: photoFile, data: photoJpeg },
  ]);
}

/** Число без хвоста из float64-шума: 0.30000000000000004 → 0.3. */
function num(value: number): string {
  return String(Number(value.toFixed(6)));
}

function tuples(values: number[], size: 2 | 3): string {
  const result: string[] = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(
      `(${values
        .slice(i, i + size)
        .map(num)
        .join(", ")})`,
    );
  }
  return `[${result.join(", ")}]`;
}

/**
 * Координаты фото. В glTF и в сцене начало — левый верхний угол фото,
 * в USD — левый нижний. Без переворота картина висела бы вверх ногами.
 */
function usdTexCoords(uvs: number[]): number[] {
  return uvs.map((value, i) => (i % 2 === 1 ? 1 - value : value));
}

function mesh(part: ArPart): string {
  const triangles = part.indices.length / 3;
  const st =
    part.uvs === undefined
      ? ""
      : `
                texCoord2f[] primvars:st = ${tuples(usdTexCoords(part.uvs), 2)} (
                    interpolation = "vertex"
                )`;

  return `
            def Mesh "${part.name}" (
                prepend apiSchemas = ["MaterialBindingAPI"]
            )
            {
                int[] faceVertexCounts = [${Array(triangles).fill(3).join(", ")}]
                int[] faceVertexIndices = [${part.indices.join(", ")}]
                rel material:binding = </Root/Materials/${part.material.name}>
                normal3f[] normals = ${tuples(part.normals, 3)} (
                    interpolation = "vertex"
                )
                point3f[] points = ${tuples(part.positions, 3)}${st}
                uniform token subdivisionScheme = "none"
            }`;
}

function material(material: ArMaterial): string {
  const path = `/Root/Materials/${material.name}`;
  const color = material.hasPhoto
    ? `color3f inputs:diffuseColor.connect = <${path}/Photo.outputs:rgb>`
    : `color3f inputs:diffuseColor = (${material.color.map(num).join(", ")})`;

  // Фото читается как sRGB: в нём цвета такие, какими их видит глаз.
  const photo = material.hasPhoto
    ? `

        def Shader "TexCoords"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            float2 inputs:fallback = (0, 0)
            token inputs:varname = "st"
            float2 outputs:result
        }

        def Shader "Photo"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @${photoFile}@
            token inputs:sourceColorSpace = "sRGB"
            float2 inputs:st.connect = <${path}/TexCoords.outputs:result>
            token inputs:wrapS = "clamp"
            token inputs:wrapT = "clamp"
            float3 outputs:rgb
        }`
    : "";

  return `
    def Material "${material.name}"
    {
        token outputs:surface.connect = <${path}/Surface.outputs:surface>

        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            ${color}
            float inputs:metallic = ${num(material.metallic)}
            float inputs:roughness = ${num(material.roughness)}
            token outputs:surface
        }${photo}
    }`;
}

/**
 * Описание сцены. Устройство — как у сцен из Reality Composer (и у экспорта
 * three.js, который этим пользуется): «библиотека сцен» с одной сценой,
 * и уже на ней — крепление к стене. Так его понимают все версии Quick Look.
 */
function usda(scene: ArScene): string {
  return `#usda 1.0
(
    customLayerData = {
        string creator = "berlant-art"
    }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root"
{
    def Scope "Scenes" (
        kind = "sceneLibrary"
    )
    {
        def Xform "Scene" (
            customData = {
                bool preliminary_collidesWithEnvironment = 0
                string sceneName = "Scene"
            }
            sceneName = "Scene"
        )
        {
            token preliminary:anchoring:type = "plane"
            token preliminary:planeAnchoring:alignment = "vertical"
${scene.parts.map(mesh).join("\n")}
        }
    }

    def "Materials"
    {${scene.parts.map((part) => material(part.material)).join("\n")}
    }
}
`;
}

type ZipEntry = { name: string; data: Uint8Array };

/**
 * Zip без сжатия, данные каждого файла — с границы в 64 байта. Выравнивание
 * делается «лишним полем» в заголовке файла, как у usdzip от Pixar. Дата
 * в заголовках постоянная: одинаковая сцена даёт одинаковые байты, и кэш
 * их не различает зря.
 */
function zipStored(entries: ZipEntry[]): Uint8Array {
  const pieces: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = new TextEncoder().encode(name);
    const checksum = crc32(data);

    let padding = (64 - ((offset + 30 + nameBytes.length) % 64)) % 64;
    // Поле короче 4 байт не записать: у него заголовок — номер и длина.
    if (padding > 0 && padding < 4) padding += 64;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // версия формата, нужная для чтения
    local.setUint16(6, 0, true); // флаги
    local.setUint16(8, 0, true); // без сжатия
    local.setUint16(10, 0, true); // время
    local.setUint16(12, 0x21, true); // дата: 1 января 1980
    local.setUint32(14, checksum, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, padding, true);

    const extra = new DataView(new ArrayBuffer(padding));
    if (padding > 0) {
      extra.setUint16(0, 0x1986, true); // номер поля — как у usdzip
      extra.setUint16(2, padding - 4, true);
    }

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, 0, true);
    entry.setUint16(14, 0x21, true);
    entry.setUint32(16, checksum, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);

    for (const piece of [
      new Uint8Array(local.buffer),
      nameBytes,
      new Uint8Array(extra.buffer),
      data,
    ]) {
      pieces.push(piece);
      offset += piece.length;
    }
  }

  const centralSize = central.reduce((sum, piece) => sum + piece.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...pieces, ...central, new Uint8Array(end.buffer)];
  const result = new Uint8Array(all.reduce((sum, piece) => sum + piece.length, 0));
  let position = 0;
  for (const piece of all) {
    result.set(piece, position);
    position += piece.length;
  }
  return result;
}
