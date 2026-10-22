import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { enUi } from "@/lib/i18n/en-ui";
import { ru } from "@/lib/i18n/ru";
import { ruUi } from "@/lib/i18n/ru-ui";

const root = path.join(import.meta.dirname, "..", "..");

/** Все .ts/.tsx проекта в папках с кодом, без сгенерированного клиента базы. */
function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => !file.includes(`${path.sep}generated${path.sep}`));
}

describe("словарь: интерфейс отдельно от текстов страниц (тикет О-12)", () => {
  it("серверный словарь включает строки интерфейса целиком, на обоих языках", () => {
    for (const [full, ui] of [
      [ru, ruUi],
      [en, enUi],
    ] as const) {
      const sections = new Map(Object.entries(full));
      for (const [section, strings] of Object.entries(ui)) {
        expect(sections.get(section)).toBe(strings);
      }
    }
  });

  it("длинных текстов страниц в строках интерфейса нет", () => {
    for (const section of ["about", "privacy", "hero", "seo"]) {
      expect(Object.keys(ruUi)).not.toContain(section);
    }
  });

  it("клиентский код не дотягивается до полного словаря — ни сам, ни через модули lib/", () => {
    // Так и было: примерочная (клиентская) звала функцию из
    // lib/room-options.ts, а та брала полный словарь, — и в браузер уходили
    // оба словаря целиком. Поэтому проверяется вся цепочка импортов.
    const offenders = ["app", "components", "lib"]
      .flatMap(sourceFiles)
      .filter((file) => /^["']use client["']/.test(readFileSync(file, "utf8")))
      .map((file) => [path.relative(root, file), pathToFullDictionary(file)] as const)
      .filter(([, chain]) => chain !== null)
      .map(([file, chain]) => `${file} → ${chain?.join(" → ")}`);
    expect(offenders).toEqual([]);
  });
});

const fullDictionaryFiles = new Set(
  ["index.ts", "ru.ts", "en.ts"].map((name) => path.join(root, "lib", "i18n", name)),
);

/** Импорты модуля, которые попадут в сборку: `import type` пропускается. */
function valueImports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const specifiers = [...source.matchAll(/^import\s+(?!type\s)[\s\S]*?\sfrom\s+"([^"]+)";/gm)].map(
    (match) => match[1],
  );
  return specifiers.flatMap((specifier) => {
    const base = specifier.startsWith("@/")
      ? path.join(root, specifier.slice(2))
      : specifier.startsWith(".")
        ? path.join(path.dirname(file), specifier)
        : null;
    if (base === null) return [];
    const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
    return candidates.filter((candidate) => existsSync(candidate));
  });
}

/** Цепочка импортов от файла до полного словаря или `null`, если её нет. */
function pathToFullDictionary(file: string, seen = new Set<string>()): string[] | null {
  for (const target of valueImports(file)) {
    if (fullDictionaryFiles.has(target)) return [path.relative(root, target)];
    if (seen.has(target)) continue;
    // Серверное действие: в браузер уходит не его код, а ссылка на сервер.
    if (/^["']use server["']/.test(readFileSync(target, "utf8"))) continue;
    seen.add(target);
    const rest = pathToFullDictionary(target, seen);
    if (rest !== null) return [path.relative(root, target), ...rest];
  }
  return null;
}
