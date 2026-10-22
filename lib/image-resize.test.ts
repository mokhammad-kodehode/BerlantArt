import { describe, expect, it } from "vitest";

import { imageResizeProblem } from "@/lib/env";
import { cloudflareImageUrl, isResizable } from "@/lib/image-resize";

const own = "https://img.berlant-art.com/artworks/0a3a43b5-dom.webp";

describe("cloudflareImageUrl", () => {
  it("фото со своего домена — копия нужной ширины с того же домена", () => {
    expect(cloudflareImageUrl({ src: own, width: 640 })).toBe(
      "https://img.berlant-art.com/cdn-cgi/image/" +
        "width=640,quality=85,format=auto,fit=scale-down,onerror=redirect" +
        "/artworks/0a3a43b5-dom.webp",
    );
  });

  it("разные ширины — разные адреса, иначе браузеру не из чего выбирать", () => {
    const widths = [640, 828, 1200].map((width) => cloudflareImageUrl({ src: own, width }));
    expect(new Set(widths).size).toBe(3);
  });

  it("качество, заданное у картинки, побеждает умолчание", () => {
    expect(cloudflareImageUrl({ src: own, width: 640, quality: 60 })).toContain("quality=60,");
  });

  it("картинки из public/ и с r2.dev отдаются как есть", () => {
    for (const src of [
      "/about/berlant-u-molberta.webp",
      "https://pub-abc.r2.dev/artworks/a.webp",
    ]) {
      expect(cloudflareImageUrl({ src, width: 640 })).toBe(src);
      expect(isResizable(src)).toBe(false);
    }
  });
});

describe("imageResizeProblem", () => {
  it("нарезка выключена — проверять нечего", () => {
    expect(imageResizeProblem(undefined, "https://pub-abc.r2.dev")).toBeNull();
    expect(imageResizeProblem(undefined, undefined)).toBeNull();
  });

  it("свой домен — можно", () => {
    expect(imageResizeProblem("cloudflare", "https://img.berlant-art.com")).toBeNull();
  });

  it("r2.dev или пустой адрес — сборка падает с объяснением, а не молчит", () => {
    expect(imageResizeProblem("cloudflare", "https://pub-abc.r2.dev")).toContain("r2.dev");
    expect(imageResizeProblem("cloudflare", undefined)).toContain("NEXT_PUBLIC_R2_PUBLIC_URL");
  });
});
