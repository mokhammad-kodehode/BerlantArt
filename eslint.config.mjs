import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Правила, которые проверяет машина.
 *
 * Всё, что можно поручить линтеру, поручается линтеру: договорённость,
 * записанная только в .ai/rules/, забывается через месяц, а упавший
 * `npm run lint` не забывается никогда.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    // Умолчания eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Клиент Prisma переписывается каждой командой `prisma generate` —
    // проверять его бессмысленно, а править нечего.
    "lib/generated/**",
  ]),

  {
    // Граница слоёв: страницы и компоненты не ходят в базу напрямую.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/generated/*", "@prisma/*"],
              message:
                "Запросы к базе живут в lib/artworks.ts. Страница, которая пишет Prisma-запрос сама, рано или поздно разойдётся с остальными — см. .ai/rules/architecture.md.",
            },
          ],
        },
      ],
    },
  },

  {
    // Переменные окружения читаются в одном месте и проверяются схемой.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"],
    ignores: ["lib/env.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Читай переменные через serverEnv/clientEnv из lib/env.ts: там они проверены схемой, и пустое значение падает на сборке, а не на проде.",
        },
      ],
    },
  },
]);

export default eslintConfig;
