import { decodeEntities } from "./crawl.mjs";

/**
 * Сверка страницы с её Content-Security-Policy (тикет О-15).
 *
 * Политику исполняет только браузер: сервер отдаёт страницу как обычно,
 * а запрещённая картинка или скрипт просто не загрузится у посетителя —
 * ни сборка, ни обход ссылок этого не заметят. Поэтому каждая страница
 * обхода сверяется здесь: всё, что её разметка грузит (картинки, скрипты,
 * стили, видео, шрифты, значки), должно быть разрешено политикой.
 *
 * Видно только то, что есть в разметке. Картинку, которую скрипт создаёт
 * сам (фото стены в примерочной), и запрос из кода (загрузка фото
 * в админке) проверяет человек в браузере.
 */

/**
 * Какое правило политики отвечает за `<link>` по его `rel` и `as`.
 * Значки — картинки, предзагрузка — по тому, что предзагружается.
 */
function linkDirective(tag) {
  const rel = (attribute(tag, "rel") ?? "").toLowerCase().split(/\s+/);
  if (rel.includes("stylesheet")) return "style-src";
  if (rel.includes("modulepreload")) return "script-src";
  if (rel.includes("manifest")) return "manifest-src";
  if (rel.some((value) => value.endsWith("icon"))) return "img-src";
  if (rel.includes("preload")) {
    const as = attribute(tag, "as");
    return (
      { image: "img-src", script: "script-src", style: "style-src", font: "font-src" }[as] ?? null
    );
  }
  return null;
}

/** Значение атрибута тега или `null`. React пишет атрибуты в двойных кавычках. */
function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return match === null ? null : decodeEntities(match[1]);
}

/**
 * Адреса из `srcset`. Делить по запятой нельзя: в адресах копий от
 * Cloudflare она есть (`/cdn-cgi/image/width=640,quality=85/…`). Как
 * в стандарте: адрес — слово без пробелов, после него размер до запятой.
 */
export function srcsetUrls(value) {
  const urls = [];
  let isUrlNext = true;
  for (const word of value.trim().split(/\s+/)) {
    if (isUrlNext) {
      urls.push(word.replace(/,+$/, ""));
      isUrlNext = word.endsWith(",");
    } else if (word.endsWith(",")) {
      isUrlNext = true;
    }
  }
  return urls.filter(Boolean);
}

/**
 * Что грузит разметка страницы: адрес и правило политики, которое за него
 * отвечает.
 *
 * @param {string} body
 * @returns {{ url: string; directive: string }[]}
 */
export function pageResources(body) {
  const resources = [];
  const add = (directive, value) => {
    if (value !== null && value !== "") resources.push({ url: value, directive });
  };

  for (const [tag, name] of body.matchAll(/<(img|script|video|audio|source|link)\b[^>]*>/gi)) {
    switch (name.toLowerCase()) {
      case "img":
        add("img-src", attribute(tag, "src"));
        for (const url of srcsetUrls(attribute(tag, "srcset") ?? "")) add("img-src", url);
        break;
      case "script":
        add("script-src", attribute(tag, "src"));
        break;
      case "video":
        add("media-src", attribute(tag, "src"));
        add("img-src", attribute(tag, "poster"));
        break;
      case "audio":
        add("media-src", attribute(tag, "src"));
        break;
      case "source":
        // У <source> в <video> — src, в <picture> — srcset картинки.
        add("media-src", attribute(tag, "src"));
        for (const url of srcsetUrls(attribute(tag, "srcset") ?? "")) add("img-src", url);
        break;
      case "link": {
        const directive = linkDirective(tag);
        if (directive === null) break;
        add(directive, attribute(tag, "href"));
        for (const url of srcsetUrls(attribute(tag, "imagesrcset") ?? "")) add(directive, url);
        break;
      }
    }
  }
  return resources;
}

/**
 * Политика как словарь «правило → источники».
 *
 * @param {string} header
 * @returns {Map<string, string[]>}
 */
export function parsePolicy(header) {
  const policy = new Map();
  for (const part of header.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    const directive = name.toLowerCase();
    // Повтор правила браузер не учитывает — действует первое.
    if (directive !== "" && !policy.has(directive)) policy.set(directive, sources);
  }
  return policy;
}

/**
 * Разрешает ли источник политики адрес. Поддержано то, что бывает в нашей
 * политике и в стандарте чаще всего: 'self', 'none', схема (`blob:`),
 * домен с `*.` в начале и необязательными портом и путём.
 */
function sourceAllows(source, url, pageOrigin) {
  if (source === "'self'") return url.origin === pageOrigin;
  if (source.startsWith("'")) return false; // 'unsafe-inline', 'none', ключи — не про адреса
  if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) return url.protocol === source.toLowerCase();

  const match = source.match(/^(?:([a-z][a-z0-9+.-]*):\/\/)?([^/:]+)(?::(\d+|\*))?(\/.*)?$/i);
  if (match === null) return false;
  const [, scheme, host, port, path] = match;
  const pageProtocol = new URL(pageOrigin).protocol;
  if (scheme !== undefined && url.protocol !== `${scheme.toLowerCase()}:`) return false;
  if (scheme === undefined && url.protocol !== pageProtocol && url.protocol !== "https:") {
    return false;
  }
  const hostname = host.toLowerCase();
  const isHostAllowed = hostname.startsWith("*.")
    ? url.hostname.endsWith(hostname.slice(1))
    : url.hostname === hostname;
  if (!isHostAllowed) return false;
  if (port !== undefined && port !== "*" && url.port !== port) return false;
  if (path === undefined || path === "/") return true;
  return path.endsWith("/") ? url.pathname.startsWith(path) : url.pathname === path;
}

/**
 * Что на странице нарушает её политику, — по строке на нарушение.
 * Пустой список — всё разрешено.
 *
 * @param {{ url: string; body: string; headers: Headers }} page
 * @returns {string[]}
 */
export function cspProblems({ url: pageUrl, body, headers }) {
  const header = headers.get("content-security-policy");
  if (header === null) return ["нет заголовка Content-Security-Policy"];

  const policy = parsePolicy(header);
  const problems = [];
  if (policy.get("script-src")?.includes("'unsafe-eval'")) {
    problems.push("в политике 'unsafe-eval' — он нужен только при разработке");
  }

  const pageOrigin = new URL(pageUrl).origin;
  const seen = new Set();
  for (const { url: raw, directive } of pageResources(body)) {
    const key = `${directive} ${raw}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const sources = policy.get(directive) ?? policy.get("default-src");
    if (sources === undefined) continue; // правила нет вовсе — браузер не ограничивает
    const url = new URL(raw, pageUrl);
    if (!sources.some((source) => sourceAllows(source, url, pageOrigin))) {
      problems.push(`${directive} не разрешает ${url.href}`);
    }
  }
  return problems;
}
