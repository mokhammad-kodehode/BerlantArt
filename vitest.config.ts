import { defineConfig } from "vitest/config";

/**
 * Тесты стоят там, где логику можно сломать незаметно, а не ради покрытия
 * (.ai/rules/quality.md): чистые функции, слой данных на временной базе
 * внутри процесса (lib/testing, О-17) и сторожа правил. Сети и боевой базы
 * они не трогают.
 *
 * Подставные переменные окружения нужны потому, что lib/env.ts проверяет
 * окружение при загрузке модуля: без них не импортировался бы ни один
 * модуль, который его подключает.
 */
export default defineConfig({
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    // scripts/ — проверка сайта целиком (О-19): её обходчик тоже под тестами.
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      NEXT_PUBLIC_R2_PUBLIC_URL: "https://pub-test.r2.dev",
    },
  },
});
