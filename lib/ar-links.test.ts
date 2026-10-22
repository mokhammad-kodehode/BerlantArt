import { describe, expect, it } from "vitest";

import { arFileUrl, isArFile, quickLookUrl, roomPageUrl, sceneViewerUrl } from "@/lib/ar-links";
import { parseRoomOptions } from "@/lib/room-options";

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
  it("примерочная не пишет умолчаний", () => {
    expect(roomPageUrl("w1", { frame: "none", finish: "gold" })).toBe("/gallery/w1/room");
    expect(roomPageUrl("w1", { frame: "thin", finish: "black" })).toBe(
      "/gallery/w1/room?frame=thin",
    );
  });

  it("старая ссылка на камеру открывает примерочную с той же рамой", () => {
    // Так страница /gallery/[id]/ar перенаправляет с 22.10.2026.
    const query = { frame: "thin", finish: "white" };
    expect(roomPageUrl("w1", parseRoomOptions(query))).toBe(
      "/gallery/w1/room?frame=thin&finish=white",
    );
    expect(roomPageUrl("w1", parseRoomOptions(query), "en")).toBe(
      "/en/gallery/w1/room?frame=thin&finish=white",
    );
  });
});

describe("открытие камеры", () => {
  it("Android: Scene Viewer сразу в камеру, на стену, без масштаба", () => {
    const url = sceneViewerUrl({
      glbUrl: "https://site.test/gallery/w1/ar/model.glb?v=abc&frame=classic&finish=gold",
      title: "Башни в тумане",
      fallbackUrl: "https://site.test/gallery/w1/room#no-ar",
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
      `S.browser_fallback_url=${encodeURIComponent("https://site.test/gallery/w1/room#no-ar")};`,
    );
    expect(intent.endsWith(";end;")).toBe(true);
  });

  it("iPhone: Quick Look без масштаба, делится страницей", () => {
    expect(quickLookUrl("/m.usdz?v=1", { pageUrl: "https://site.test/gallery/w1/room" })).toBe(
      "/m.usdz?v=1#allowsContentScaling=0&canonicalWebPageURL=https%3A%2F%2Fsite.test%2Fgallery%2Fw1%2Froom",
    );
  });

  it("iPhone: плашка с названием, размером и кнопкой", () => {
    const url = quickLookUrl("/m.usdz", {
      pageUrl: "https://site.test/p",
      banner: { title: "Ромашки", subtitle: "Холст 60 × 60 см", action: "Написать о картине" },
    });
    const params = new URLSearchParams(url.split("#")[1]);

    expect(params.get("checkoutTitle")).toBe("Ромашки");
    expect(params.get("checkoutSubtitle")).toBe("Холст 60 × 60 см");
    expect(params.get("callToAction")).toBe("Написать о картине");
    // Пробелы — %20, а не «+»: так в примерах Apple, «+» Quick Look покажет как есть.
    expect(url).toContain("callToAction=%D0%9D%D0%B0%D0%BF%D0%B8%D1%81%D0%B0%D1%82%D1%8C%20");
  });

  it("Android: кнопка «написать» — параметром link", () => {
    const url = sceneViewerUrl({
      glbUrl: "https://site.test/m.glb",
      title: "Ромашки",
      link: "https://wa.me/79990000000?text=Здравствуйте",
      fallbackUrl: "https://site.test/p#no-ar",
    });
    const query = new URL(url.split("#")[0].replace("intent://", "https://")).searchParams;
    expect(query.get("link")).toBe("https://wa.me/79990000000?text=Здравствуйте");
  });
});
