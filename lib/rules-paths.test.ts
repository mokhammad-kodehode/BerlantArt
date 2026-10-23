import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Правила проекта ссылаются только на то, что существует (тикет О-20).
 *
 * По правилам в .ai/rules/ принимаются решения, и устаревшее правило
 * опаснее отсутствующего: обзор 22.10.2026 нашёл ссылки на удалённый
 * lib/demo-artworks.ts в трёх правилах и обещание «error.tsx пока нет»
 * при давно существующем файле. Тест не даст этому повториться для путей:
 * переименовал файл — поправь и правило.
 *
 * Проверяются пути в обратных кавычках (`lib/env.ts`) и ссылки Markdown
 * (`[data.md](./data.md)`). Утверждения словами («пять работ») тест
 * не проверит — их сверяет человек.
 */

const root = path.join(import.meta.dirname, "..");
const rulesDir = path.join(root, ".ai", "rules");
const files = [
  ...readdirSync(rulesDir).map((name) => path.join(rulesDir, name)),
  path.join(root, "AGENTS.md"),
];

/**
 * Упоминания, которых в проекте нет намеренно, — с причиной.
 */
const historical = new Set([
  // security.md рассказывает, как этот файл однажды отдавался из public/
  // всем желающим, — потому его и перенесли в docs/.
  "public/artworks/README.md",
]);

/** Пути, которые проверять нечем: собираются генератором, не лежат в git. */
const generated = /^lib\/generated\b/;

/** Путь из правила существует: как есть или как модуль без расширения. */
function exists(target: string): boolean {
  return ["", ".ts", ".tsx", ".mjs"].some((extension) => existsSync(target + extension));
}

function brokenReferences(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const projectPaths = [
    ...text.matchAll(
      /`((?:app|components|lib|scripts|prisma|public|docs|design|\.github)\/[^`\s*]+)`/g,
    ),
  ]
    .map((match) => match[1].replace(/[),.:;]+$/, ""))
    // Шаблоны вроде app/(ru)/gallery/[id] или <страница> — не пути.
    .filter((reference) => !/[[\]<>…{}]/.test(reference))
    .filter((reference) => !generated.test(reference) && !historical.has(reference))
    .filter((reference) => !exists(path.join(root, reference)));

  const markdownLinks = [...text.matchAll(/\]\((\.{1,2}\/[^)#\s]+)/g)]
    .map((match) => match[1])
    .filter((link) => !exists(path.join(path.dirname(file), link)));

  return [...projectPaths, ...markdownLinks];
}

describe("правила проекта ссылаются на существующее (тикет О-20)", () => {
  it.each(files.map((file) => [path.relative(root, file), file]))("%s", (_name, file) => {
    expect(brokenReferences(file)).toEqual([]);
  });
});
