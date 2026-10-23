import { describe, expect, it } from "vitest";

import { cspProblems, pageResources, parsePolicy, srcsetUrls } from "./csp.mjs";

/**
 * Сверка страницы с политикой безопасности (тикет О-15). Сторож, который
 * пропускает запрещённое, хуже отсутствующего: он обещает, что картины
 * у посетителя загрузятся.
 */

const policy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: https://img.site.test",
  "connect-src 'self' https://*.r2.cloudflarestorage.com",
  "object-src 'none'",
].join("; ");

function page(body: string, header: string | null = policy) {
  const headers = new Headers(header === null ? {} : { "content-security-policy": header });
  return { url: "http://site.test/gallery", body, headers };
}

describe("srcsetUrls", () => {
  it("адреса с запятой внутри (копии Cloudflare) не рвутся", () => {
    const srcset =
      "https://img.site.test/cdn-cgi/image/width=640,quality=85/a.webp 640w, " +
      "https://img.site.test/cdn-cgi/image/width=1200,quality=85/a.webp 1200w";
    expect(srcsetUrls(srcset)).toEqual([
      "https://img.site.test/cdn-cgi/image/width=640,quality=85/a.webp",
      "https://img.site.test/cdn-cgi/image/width=1200,quality=85/a.webp",
    ]);
  });

  it("без размеров и с плотностью", () => {
    expect(srcsetUrls("/a.jpg, /b.jpg 2x")).toEqual(["/a.jpg", "/b.jpg"]);
  });
});

describe("pageResources", () => {
  it("каждый ресурс — под своим правилом; ссылки и пустые атрибуты — нет", () => {
    const html = `
      <a href="https://instagram.com/x">Instagram</a>
      <img src="/a.jpg" srcset="/a.jpg 1x, https://img.site.test/a.webp 2x">
      <script src="/_next/static/app.js"></script>
      <script>self.__next_f.push([])</script>
      <video src="/video/reel.mp4#t=1" poster="/poster.jpg"></video>
      <link rel="stylesheet" href="/_next/static/app.css">
      <link rel="preload" as="font" href="/_next/static/media/a.woff2">
      <link rel="preload" as="image" imagesrcset="/b.jpg 640w, /c.jpg 1200w">
      <link rel="icon" href="/icon.png">
      <link rel="canonical" href="http://site.test/gallery">`;
    expect(pageResources(html)).toEqual([
      { directive: "img-src", url: "/a.jpg" },
      { directive: "img-src", url: "/a.jpg" },
      { directive: "img-src", url: "https://img.site.test/a.webp" },
      { directive: "script-src", url: "/_next/static/app.js" },
      { directive: "media-src", url: "/video/reel.mp4#t=1" },
      { directive: "img-src", url: "/poster.jpg" },
      { directive: "style-src", url: "/_next/static/app.css" },
      { directive: "font-src", url: "/_next/static/media/a.woff2" },
      { directive: "img-src", url: "/b.jpg" },
      { directive: "img-src", url: "/c.jpg" },
      { directive: "img-src", url: "/icon.png" },
    ]);
  });
});

describe("parsePolicy", () => {
  it("правила без учёта регистра; повтор не перекрывает первое", () => {
    const parsed = parsePolicy("IMG-SRC 'self'; img-src *; default-src 'none';");
    expect(parsed.get("img-src")).toEqual(["'self'"]);
    expect(parsed.get("default-src")).toEqual(["'none'"]);
  });
});

describe("cspProblems", () => {
  it("свои файлы, домен картинок и встроенный скрипт — разрешены", () => {
    const html = `
      <img src="https://img.site.test/a.webp" srcset="/a.jpg 1x">
      <script>self.__next_f.push([])</script>
      <script src="/_next/static/app.js"></script>
      <video src="/video/reel.mp4"></video>`;
    expect(cspProblems(page(html))).toEqual([]);
  });

  it("картина с домена не из списка — нарушение, с правилом и адресом", () => {
    const html = `<img src="https://pub-123.r2.dev/a.webp">`;
    expect(cspProblems(page(html))).toEqual(["img-src не разрешает https://pub-123.r2.dev/a.webp"]);
  });

  it("правила нет — действует default-src: видео из бакета запрещено", () => {
    const html = `<video src="https://img.site.test/reel.mp4"></video>`;
    expect(cspProblems(page(html))).toEqual([
      "media-src не разрешает https://img.site.test/reel.mp4",
    ]);
  });

  it("чужой скрипт запрещён, 'unsafe-inline' адресов не разрешает", () => {
    const html = `<script src="https://evil.test/x.js"></script>`;
    expect(cspProblems(page(html))).toEqual(["script-src не разрешает https://evil.test/x.js"]);
  });

  it("'none' запрещает всё, звёздочка домена — только поддомены", () => {
    const strict = "default-src 'none'; img-src https://*.site.test";
    expect(cspProblems(page(`<img src="https://img.site.test/a.webp">`, strict))).toEqual([]);
    expect(cspProblems(page(`<img src="https://site.test/a.webp">`, strict))).toEqual([
      "img-src не разрешает https://site.test/a.webp",
    ]);
    expect(cspProblems(page(`<script src="/a.js"></script>`, strict))).toEqual([
      "script-src не разрешает http://site.test/a.js",
    ]);
  });

  it("нет заголовка — нарушение; 'unsafe-eval' в боевой сборке — тоже", () => {
    expect(cspProblems(page("", null))).toEqual(["нет заголовка Content-Security-Policy"]);
    expect(cspProblems(page("", "script-src 'self' 'unsafe-eval'"))).toEqual([
      "в политике 'unsafe-eval' — он нужен только при разработке",
    ]);
  });

  it("одинаковый ресурс на странице — одна строка, а не десять", () => {
    const html = `<img src="https://x.test/a.webp"><img src="https://x.test/a.webp">`;
    expect(cspProblems(page(html))).toHaveLength(1);
  });
});
