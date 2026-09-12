"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { login, type LoginState } from "@/lib/actions/auth";

/**
 * Форма входа.
 *
 * Клиентская — из-за `useActionState`: без неё ошибка «неверный пароль»
 * показывалась бы только после полной перезагрузки страницы.
 *
 * Почта подставляется из `state` обратно в поле: React 19 после Server
 * Action очищает форму целиком, и при опечатке в пароле человеку пришлось
 * бы вводить заново оба поля. Проверено в браузере — без этого поле
 * действительно пустело.
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Почта
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          className="input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      {state.error && (
        // role="alert" — чтобы скринридер прочитал ошибку, а не оставил
        // человека гадать, почему форма не отправилась (.ai/rules/quality.md).
        <p role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" block disabled={isPending}>
        {isPending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
