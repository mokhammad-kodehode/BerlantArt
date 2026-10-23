import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";

import { startPgliteServer } from "../../lib/testing/pglite-server.mjs";

import { crawl, open, serverErrorDigest } from "./crawl.mjs";

/**
 * Проверка сайта целиком (тикет О-19): `npm run check:site`.
 *
 * Временная база (та же, что в тестах слоя данных) → пять работ из
 * prisma/seed.ts → сборка сайта, как для Vercel → запуск → обход по
 * ссылкам, как у поисковика (crawl.mjs) → отчёт. Битая ссылка, страница
 * с ответом не 200 и ошибка в журнале сервера роняют проверку.
 *
 * Боевую базу проверка не трогает: строка подключения подставляется
 * в окружение явно, а Next и prisma/seed.ts уже заданные переменные из
 * .env.local не перезаписывают. Перед сборкой это проверяется: пять
 * работ должны лечь именно во временную базу.
 *
 * `--no-build` — запустить прошлую сборку: быстрее, когда меняли только
 * эту проверку, а не сайт.
 */

const root = path.join(import.meta.dirname, "..", "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const skipBuild = process.argv.includes("--no-build");

/** Сколько работ кладёт prisma/seed.ts. */
const seededArtworks = 5;

/**
 * Адреса, на которые со страниц может не быть ссылок, — и чего от них
 * ждать. Сначала обхода: найдёт ли он их по ссылкам, неизвестно.
 */
const expectations = [
  // Несуществующее — ответ 404, а не 500 и не «пустая» 200.
  { path: "/net-takoy-stranicy", status: 404 },
  { path: "/gallery/net-takoy-raboty", status: 404 },
  { path: "/gallery/category/net-takoy-kategorii", status: 404 },
  // Старые ссылки из мессенджеров (О-11) ведут на новые адреса.
  { path: "/gallery?category=Цветы", redirectTo: "/gallery/category/flowers" },
  { path: "/gallery?q=башни", redirectTo: "/gallery/search" },
  // Админка без входа — на страницу входа.
  { path: "/admin", redirectTo: "/admin/login" },
  // То, что подгружают страницы сами, без ссылки.
  { path: "/api/artwork-thumbs", status: 200 },
  { path: "/gallery/search?q=башни", status: 200 },
  { path: "/en/gallery/search?q=towers", status: 200 },
];

/**
 * Строки журнала сервера, которые ошибкой не считаются. Каждая — с причиной.
 */
const harmlessServerLog = [
  // Так Next отмечает адрес категории не из списка (dynamicParams = false)
  // и сам отвечает на него 404 — его мы и проверяем в expectations.
  /NoFallbackError/,
];

/** Свободный порт: адрес сайта нужно знать до сборки — он попадает в ссылки. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** Запускает команду Node и ждёт её конца; вывод — как есть, в консоль. */
function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`«${args.join(" ")}» завершилась с кодом ${code}`)),
    );
  });
}

/** Ждёт, пока запущенный сайт начнёт отвечать. */
async function waitUntilUp(origin, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(origin, { redirect: "manual" });
      return;
    } catch {
      // Ещё не слушает порт — подождать и спросить снова.
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`сайт не ответил за ${timeoutMs / 1000} с`);
}

/** Что не так с особым адресом, или `null`. */
async function checkExpectation(origin, { path: address, status, redirectTo }) {
  const result = await open(new URL(address, origin).href);
  const digest = result.body === null ? null : serverErrorDigest(result.body);
  if (digest !== null) return `ответ ${result.status}, но внутри ошибка сервера (${digest})`;
  if (redirectTo !== undefined) {
    const landed = new URL(result.finalUrl).pathname;
    if (result.redirects.length === 0)
      return `ждали перенаправления на ${redirectTo}, ответ ${result.status}`;
    if (landed !== redirectTo) return `перенаправляет на ${landed}, ждали ${redirectTo}`;
    if (result.status !== 200) return `перенаправляет на ${landed}, а там ответ ${result.status}`;
    return null;
  }
  if (result.redirects.length > 0)
    return `перенаправляет на ${result.finalUrl}, ждали ответ ${status}`;
  return result.status === status ? null : `ответ ${result.status}, ждали ${status}`;
}

/**
 * Настройки входа в админку — как на проде, но ненастоящие: сайт должен
 * вести себя так же, как настроенный (без них проверка сессии пишет
 * ошибку в журнал), а войти по ним нельзя: хеш ни от какого пароля.
 */
const fakeAdmin = {
  AUTH_SECRET: "site-check-secret-not-for-production-0000",
  AUTH_ADMIN_EMAIL: "site-check@example.test",
  AUTH_ADMIN_PASSWORD_HASH: `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`,
};

/** @returns {Promise<number>} сколько ошибок найдено */
async function main() {
  const database = await startPgliteServer({ maxConnections: 500 });
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    ...fakeAdmin,
    DATABASE_URL: database.connectionString,
    NEXT_PUBLIC_SITE_URL: origin,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  let server;

  try {
    console.log("▸ Временная база готова, заполняю её…");
    await run(["prisma/seed.ts"], env);
    const { rows } = await database.pg.query('SELECT count(*)::int AS n FROM "Artwork"');
    if (rows[0].n !== seededArtworks) {
      throw new Error(
        `во временной базе ${rows[0].n} работ вместо ${seededArtworks} — prisma/seed.ts ` +
          "писал не туда. Проверка остановлена, чтобы не трогать другую базу.",
      );
    }

    if (skipBuild) console.log("▸ Сборка пропущена (--no-build).");
    else {
      console.log("▸ Собираю сайт…");
      await run([nextBin, "build"], env);
    }

    console.log(`▸ Запускаю сайт на ${origin}…`);
    const serverLog = [];
    server = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [server.stdout, server.stderr]) {
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => serverLog.push(...chunk.split("\n")));
    }
    await waitUntilUp(origin);

    console.log("▸ Обхожу сайт…");
    const { checked, problems } = await crawl({
      origin,
      start: ["/", "/en", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest"],
      // Админку проверяем до входа, глубже — без пароля всё равно не пустит.
      follow: (url) => !new URL(url).pathname.startsWith("/admin/"),
    });
    for (const expectation of expectations) {
      const problem = await checkExpectation(origin, expectation);
      if (problem !== null) problems.push({ url: expectation.path, problem, from: [] });
    }

    const serverErrors = serverLog.filter(
      (line) => /error|⨯/i.test(line) && !harmlessServerLog.some((pattern) => pattern.test(line)),
    );

    console.log(`\nПроверено адресов: ${checked + expectations.length}.`);
    for (const { url, problem, from } of problems) {
      const where =
        from.length > 0 ? `\n    ссылка со страниц: ${from.slice(0, 3).join(", ")}` : "";
      console.log(`✗ ${url}: ${problem}${where}`);
    }
    for (const line of serverErrors.slice(0, 20)) console.log(`✗ журнал сервера: ${line}`);

    const errors = problems.length + serverErrors.length;
    console.log(errors > 0 ? `\nОшибок: ${errors}.` : "Ошибок нет.");
    return errors;
  } finally {
    server?.kill();
    await database.stop();
  }
}

// Код выхода — после main(), а не внутри: остановка PGlite (database.stop
// в finally) сама сбрасывает process.exitCode в 0. Поставленный раньше,
// он терялся, и проверка с ошибками считалась бы успешной (поймано
// 23.10.2026 первым же прогоном).
process.exitCode = (await main()) > 0 ? 1 : 0;
