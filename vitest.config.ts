import { defineConfig } from "vitest/config";

/**
 * Тесты покрывают только чистые функции: разбор имени файла и сборку адреса
 * картинки. Ни сети, ни базы они не трогают — по .ai/rules/quality.md тесты
 * заводятся там, где логику можно сломать незаметно, а не ради покрытия.
 *
 * Подставные переменные окружения нужны потому, что lib/env.ts проверяет
 * окружение при загрузке модуля: без них не импортировался бы даже разбор
 * имени файла.
 */
export default defineConfig({
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      NEXT_PUBLIC_R2_PUBLIC_URL: "https://pub-test.r2.dev",
    },
  },
});
