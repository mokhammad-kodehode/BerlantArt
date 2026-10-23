/**
 * Обход сайта по ссылкам, как это делает поисковик (тикет О-19).
 *
 * Только чистая логика обхода — без знания о том, какой это сайт: что
 * открыть первым и чего ждать от особых адресов, решает run.mjs. Отдельно
 * потому, что эту логику проверяют тесты (crawl.test.ts): ошибка в ней —
 * это проверка, которая молча ничего не проверяет.
 *
 * Ошибка — это: ответ не 200 у страницы, на которую ведёт ссылка;
 * перенаправление в никуда или по кругу; ссылка на несуществующий файл
 * картинки. Для каждой ошибки запоминается, с какой страницы на неё
 * ссылаются, — иначе битую ссылку пришлось бы искать по всему сайту.
 */

/** Больше перенаправлений подряд — значит, круг. */
const maxRedirects = 5;

/**
 * Ссылки из разметки страницы: ссылки, `<link>` (канонический адрес,
 * языковые версии, значки), картинки и адреса из карты сайта.
 * `srcset` не разбирается: в нём те же файлы, что в `src`, другого размера.
 *
 * @param {string} body
 * @returns {string[]}
 */
export function extractLinks(body) {
  const attributes = [...body.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((match) => match[1]);
  const sitemap = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  return [...attributes, ...sitemap].map(decodeEntities);
}

/** Разметка кодирует `&` в адресах как `&amp;`. */
function decodeEntities(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"');
}

/**
 * Адрес, который надо проверить, или `null`. Проверяются только адреса
 * своего сайта: чужие сайты — не наша забота, и отвечать на каждую
 * проверку они не обязаны. Служебные файлы Next (`/_next/`) собирает сам
 * Next — битыми они не бывают. Якорь отбрасывается: `/gallery#work-1`
 * и `/gallery` — одна страница.
 *
 * @param {string} raw
 * @param {string} pageUrl
 * @param {string} origin
 * @returns {string | null}
 */
export function checkableUrl(raw, pageUrl, origin) {
  if (raw === "" || raw.startsWith("#") || /^(mailto|tel|data|javascript|sms):/i.test(raw)) {
    return null;
  }
  let url;
  try {
    url = new URL(raw, pageUrl);
  } catch {
    // Не адрес вовсе (например, шаблон в атрибуте) — проверять нечего.
    return null;
  }
  if (url.origin !== origin || url.pathname.startsWith("/_next/")) return null;
  url.hash = "";
  return url.href;
}

/**
 * Ошибка сервера внутри страницы, ушедшей с ответом 200.
 *
 * Страница с подгрузкой (`loading.tsx`) начинает уходить к браузеру
 * раньше, чем всё отрисовано: ответ 200 уже отправлен, когда случается
 * ошибка, — и посетитель видит экран ошибки при «успешном» ответе.
 * React оставляет на месте упавшего куска метку `data-dgst` с номером
 * ошибки. Служебные метки Next (`NEXT_…` — «не найдено»,
 * перенаправление) ошибкой не считаются: это его обычная работа.
 *
 * @param {string} body
 * @returns {string | null} номер ошибки или `null`
 */
export function serverErrorDigest(body) {
  for (const [, digest] of body.matchAll(/data-dgst="([^"]*)"/g)) {
    if (!digest.startsWith("NEXT_")) return digest;
  }
  return null;
}

/** Ссылки стоит собирать только со страниц и карты сайта, не с картинок. */
function isParsable(contentType) {
  return /text\/html|xml/.test(contentType ?? "");
}

/**
 * Открывает адрес, проходя перенаправления своего сайта.
 *
 * @param {string} url
 * @param {(url: string, init: RequestInit) => Promise<Response>} fetcher
 * @returns {Promise<{ status: number; finalUrl: string; redirects: string[]; contentType: string | null; body: string | null }>}
 */
export async function open(url, fetcher = fetch) {
  const redirects = [];
  let current = url;
  for (;;) {
    const response = await fetcher(current, { redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      if (redirects.length === maxRedirects) {
        return {
          status: response.status,
          finalUrl: current,
          redirects,
          contentType: null,
          body: null,
        };
      }
      redirects.push(current);
      current = new URL(location, current).href;
      continue;
    }
    const contentType = response.headers.get("content-type");
    const body = isParsable(contentType) ? await response.text() : null;
    if (body === null) await response.body?.cancel();
    return { status: response.status, finalUrl: current, redirects, contentType, body };
  }
}

/**
 * Обходит сайт от стартовых адресов по ссылкам своего сайта.
 *
 * @param {{
 *   origin: string;
 *   start: string[];
 *   maxUrls?: number;
 *   follow?: (url: string) => boolean;
 *   fetcher?: (url: string, init: RequestInit) => Promise<Response>;
 * }} options
 *   follow — собирать ли ссылки со страницы; сама страница проверяется
 *   в любом случае (например, админка: вход проверяем, глубже не идём).
 * @returns {Promise<{ checked: number; problems: { url: string; problem: string; from: string[] }[] }>}
 */
export async function crawl({
  origin,
  start,
  maxUrls = 1000,
  follow = () => true,
  fetcher = fetch,
}) {
  /** @type {Map<string, Set<string>>} адрес → страницы, которые на него ссылаются */
  const referrers = new Map();
  const queue = [];
  const problems = [];

  const enqueue = (url, from) => {
    if (!referrers.has(url)) {
      referrers.set(url, new Set());
      queue.push(url);
    }
    if (from) referrers.get(url).add(from);
  };

  for (const path of start) enqueue(new URL(path, origin).href, null);

  while (queue.length > 0) {
    if (referrers.size > maxUrls) {
      problems.push({
        url: origin,
        problem: `адресов больше ${maxUrls} — похоже, ссылки порождают новые адреса без конца`,
        from: [],
      });
      break;
    }
    const url = queue.shift();
    const from = [...referrers.get(url)];
    const result = await open(url, fetcher);

    if (result.status !== 200) {
      const how =
        result.redirects.length > 0 ? ` (после перенаправлений на ${result.finalUrl})` : "";
      problems.push({ url, problem: `ответ ${result.status}${how}`, from });
      continue;
    }
    const digest = result.body === null ? null : serverErrorDigest(result.body);
    if (digest !== null) {
      problems.push({ url, problem: `ответ 200, но внутри ошибка сервера (${digest})`, from });
      continue;
    }
    if (result.body === null || !follow(result.finalUrl)) continue;

    for (const raw of extractLinks(result.body)) {
      const link = checkableUrl(raw, result.finalUrl, origin);
      if (link !== null) enqueue(link, result.finalUrl);
    }
  }

  return { checked: referrers.size, problems };
}
