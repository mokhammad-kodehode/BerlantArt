import { describe, expect, it } from "vitest";

import {
  arFileUrl,
  arPageUrl,
  isArFile,
  quickLookUrl,
  roomPageUrl,
  sceneViewerUrl,
} from "@/lib/ar-links";

describe("адрес модели", () => {
  it("пишет выбор всегда и в одном порядке", () => {
    expect(arFileUrl("w1", "model.glb", "abc", { frame: "classic", finish: "gold" })).toBe(
      "/gallery/w1/ar/model.glb?v=abc&frame=classic&finish=gold",
    );
  });

  it("знает только два файла", () => {
    expect(isArFile("model.usdz")).toBe(true);
    expect(isArFile("model.glb")).toBe(true);
    expect(isArFile("toString")).toBe(false);
    expect(isArFile("model.gltf")).toBe(false);
  });
});

describe("адреса страниц", () => {
  it("не пишут умолчаний и переносят раму между камерой и примерочной", () => {
    expect(arPageUrl("w1", { frame: "classic", finish: "gold" })).toBe("/gallery/w1/ar");
    expect(arPageUrl("w1", { frame: "thin", finish: "white" })).toBe(
      "/gallery/w1/ar?frame=thin&finish=white",
    );
    expect(roomPageUrl("w1", { frame: "thin", finish: "black" })).toBe(
      "/gallery/w1/room?frame=thin",
    );
  });
});

describe("открытие камеры", () => {
  it("Android: Scene Viewer сразу в камеру, на стену, без масштаба", () => {
    const url = sceneViewerUrl({
      glbUrl: "https://site.test/gallery/w1/ar/model.glb?v=abc&frame=classic&finish=gold",
      title: "Башни в тумане",
      fallbackUrl: "https://site.test/gallery/w1/ar#no-ar",
    });
    const [address, intent] = url.split("#");
    const query = new URL(address.replace("intent://", "https://")).searchParams;

    // Параметры адреса модели не должны смешаться с параметрами Scene Viewer.
    expect(query.get("file")).toBe(
      "https://site.test/gallery/w1/ar/model.glb?v=abc&frame=classic&finish=gold",
    );
    expect(query.get("mode")).toBe("ar_only");
    expect(query.get("resizable")).toBe("false");
    expect(query.get("enable_vertical_placement")).toBe("true");
    expect(query.get("title")).toBe("Башни в тумане");
    expect(intent).toContain("package=com.google.ar.core;");
    expect(intent).toContain(
      `S.browser_fallback_url=${encodeURIComponent("https://site.test/gallery/w1/ar#no-ar")};`,
    );
    expect(intent.endsWith(";end;")).toBe(true);
  });

  it("iPhone: Quick Look без масштаба", () => {
    expect(quickLookUrl("/m.usdz?v=1")).toBe("/m.usdz?v=1#allowsContentScaling=0");
  });
});
