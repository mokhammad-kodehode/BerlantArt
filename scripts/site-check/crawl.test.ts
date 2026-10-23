import { describe, expect, it } from "vitest";

import { checkableUrl, crawl, extractLinks, serverErrorDigest } from "./crawl.mjs";

/**
 * Обходчик проверки сайта (тикет О-19) на подставном мини-сайте: ошибка
 * в нём — это проверка, которая молча ничего не проверяет.
 */

const origin = "http://site.test";

/** Мини-сайт: адрес → ответ. Всё, чего нет, — 404. */
function fakeSite(pages: Record<string, { status?: number; html?: string; location?: string }>) {
  return async (url: string): Promise<Response> => {
    const page = pages[new URL(url).pathname + new URL(url).search];
    if (page === undefined) return new Response("нет", { status: 404 });
    const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
    if (page.location) headers.set("location", page.location);
    return new Response(page.html ?? "", { status: page.status ?? 200, headers });
  };
}

describe("extractLinks", () => {
  it("берёт ссылки, картинки, <link> и адреса карты сайта; srcset — нет", () => {
    const html = `
      <a href="/gallery">Галерея</a>
      <img src="/artworks/a.jpg" srcset="/artworks/a-2x.jpg 2x">
      <link rel="canonical" href="http://site.test/about">
      <a href="/gallery?x=1&amp;y=2">с параметрами</a>
      <url><loc>http://site.test/en</loc></url>`;
    expect(extractLinks(html)).toEqual([
      "/gallery",
      "/artworks/a.jpg",
      "http://site.test/about",
      "/gallery?x=1&y=2",
      "http://site.test/en",
    ]);
  });
});

describe("checkableUrl", () => {
  const page = "http://site.test/gallery/1";

  it("свой сайт — да, без якоря; относительный адрес — от страницы", () => {
    expect(checkableUrl("/gallery#work-1", page, origin)).toBe("http://site.test/gallery");
    expect(checkableUrl("room", page, origin)).toBe("http://site.test/gallery/room");
  });

  it("чужие сайты, почта, телефон, служебные файлы Next — нет", () => {
    for (const raw of [
      "https://instagram.com/x",
      "mailto:a@b.c",
      "tel:+7",
      "/_next/static/a.js",
      "#top",
      "",
    ]) {
      expect(checkableUrl(raw, page, origin), raw).toBeNull();
    }
  });
});

describe("serverErrorDigest", () => {
  it("метка ошибки React — ошибка; служебные метки Next — нет", () => {
    expect(serverErrorDigest('<template data-dgst="3423470154"></template>')).toBe("3423470154");
    expect(serverErrorDigest('<template data-dgst="NEXT_HTTP_ERROR_FALLBACK;404">')).toBeNull();
    expect(serverErrorDigest("<main>всё хорошо</main>")).toBeNull();
  });
});

describe("crawl", () => {
  it("находит битую ссылку и называет страницу, с которой она ведёт", async () => {
    const fetcher = fakeSite({
      "/": { html: '<a href="/about">О художнице</a><a href="/net">битая</a>' },
      "/about": { html: '<a href="/">Главная</a>' },
    });
    const { checked, problems } = await crawl({ origin, start: ["/"], fetcher });

    expect(checked).toBe(3);
    expect(problems).toEqual([
      { url: "http://site.test/net", problem: "ответ 404", from: ["http://site.test/"] },
    ]);
  });

  it("перенаправление к живой странице — не ошибка, по кругу — ошибка", async () => {
    const fetcher = fakeSite({
      "/": { html: '<a href="/old">старая</a><a href="/loop">круг</a>' },
      "/old": { status: 307, location: "/new" },
      "/new": { html: "новая" },
      "/loop": { status: 307, location: "/loop" },
    });
    const { problems } = await crawl({ origin, start: ["/"], fetcher });

    expect(problems.map((problem) => problem.url)).toEqual(["http://site.test/loop"]);
  });

  it("ответ 200 с ошибкой внутри — ошибка", async () => {
    const fetcher = fakeSite({ "/": { html: '<template data-dgst="123"></template>' } });
    const { problems } = await crawl({ origin, start: ["/"], fetcher });

    expect(problems[0].problem).toMatch(/ошибка сервера/);
  });

  it("follow: страница проверяется, но ссылки с неё не собираются", async () => {
    const fetcher = fakeSite({
      "/": { html: '<a href="/admin/login">вход</a>' },
      "/admin/login": { html: '<a href="/admin/secret">глубже</a>' },
    });
    const { checked, problems } = await crawl({
      origin,
      start: ["/"],
      fetcher,
      follow: (url) => !new URL(url).pathname.startsWith("/admin/"),
    });

    expect(checked).toBe(2);
    expect(problems).toEqual([]);
  });

  it("inspect: ошибки страницы — с её адресом и тем, кто на неё ссылается", async () => {
    const fetcher = fakeSite({
      "/": { html: '<a href="/about">О художнице</a>' },
      "/about": { html: "<main>плохая</main>" },
    });
    const { problems } = await crawl({
      origin,
      start: ["/"],
      fetcher,
      inspect: ({ url, body }) => (body.includes("плохая") ? [`плохая страница ${url}`] : []),
    });

    expect(problems).toEqual([
      {
        url: "http://site.test/about",
        problem: "плохая страница http://site.test/about",
        from: ["http://site.test/"],
      },
    ]);
  });
});
