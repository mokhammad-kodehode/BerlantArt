import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

/**
 * Каждое серверное действие проверяет права (тикет О-18).
 *
 * Серверное действие — это адрес, на который можно отправить запрос
 * в обход формы и страницы: защита админки страницами и proxy.ts его не
 * касается. Держалось это на дисциплине: каждое действие начинается
 * с `assertAdmin()`. Тест делает дисциплину проверкой: подменяет
 * проверку прав на «доступа нет», а базу — на ловушку, вызывает каждое
 * действие и ждёт отказа в доступе. Дойди действие до базы, хранилища
 * или проверки данных раньше проверки прав — тест упадёт.
 *
 * Список действий не ведётся руками: тест берёт все функции, которые
 * отдают модули lib/actions/. Новое действие проверится само.
 */

class AccessDenied extends Error {}

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  assertAdmin: vi.fn(async () => {
    throw new AccessDenied("доступа нет");
  }),
}));

/** Любое обращение к базе или хранилищу — ошибка: до них действие дойти не должно. */
const trap = (what: string) =>
  new Proxy(
    {},
    {
      get(_target, property) {
        throw new Error(`${what}: обращение к «${String(property)}» до проверки прав`);
      },
    },
  );

vi.mock("@/lib/db", () => ({ db: trap("база") }));
vi.mock("@/lib/r2", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === "function"
        ? () => {
            throw new Error(`хранилище: «${name}» до проверки прав`);
          }
        : value,
    ]),
  );
});

/**
 * Действия, открытые без входа, — с причиной. Всё, чего здесь нет, обязано
 * проверять права.
 */
const publicActions: Record<string, string[]> = {
  // Вход проверяет пароль сам — до входа прав ещё нет. Выход только
  // стирает свою куку: без входа ему нечего стирать.
  "auth.ts": ["login", "logout"],
};

const actionsDir = import.meta.dirname;
const actionFiles = readdirSync(actionsDir).filter(
  (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
);

describe("серверные действия проверяют права (тикет О-18)", () => {
  it("серверные действия живут только в lib/actions/ — иначе этот тест их не увидит", () => {
    const root = path.join(actionsDir, "..", "..");
    const outside = ["app", "components", "lib"]
      .flatMap((dir) =>
        readdirSync(path.join(root, dir), { withFileTypes: true, recursive: true })
          .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
          .map((entry) => path.join(entry.parentPath, entry.name)),
      )
      .filter(
        (file) => !file.startsWith(actionsDir) && !file.includes(`${path.sep}generated${path.sep}`),
      )
      .filter((file) => /^\s*["']use server["']/m.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));
    expect(outside).toEqual([]);
  });

  it("список открытых действий не устарел: каждое из них существует", async () => {
    for (const [file, names] of Object.entries(publicActions)) {
      const exports: Record<string, unknown> = await import(path.join(actionsDir, file));
      for (const name of names) expect(typeof exports[name], `${file}: ${name}`).toBe("function");
    }
  });

  it.each(actionFiles)(
    "%s: каждое действие без входа получает отказ и не трогает данные",
    async (file) => {
      const exports: Record<string, unknown> = await import(path.join(actionsDir, file));
      const actions = Object.entries(exports).filter(
        ([name, value]) => typeof value === "function" && !publicActions[file]?.includes(name),
      );

      for (const [name, action] of actions) {
        if (typeof action !== "function") continue;
        // Аргументы любые: до них дело дойти не должно. FormData — потому что
        // её ждут действия форм, а у объекта-аргумента деструктуризация
        // пустой формы тоже не падает.
        const args = Array.from({ length: Math.max(action.length, 1) }, () => new FormData());
        await expect(action(...args), `${file}: ${name}`).rejects.toBeInstanceOf(AccessDenied);
      }
    },
  );
});
