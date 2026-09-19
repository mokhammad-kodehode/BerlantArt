"use client";

import { useActionState, useState } from "react";

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
  const [isPasswordShown, setIsPasswordShown] = useState(false);

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
        {/* Кнопка лежит поверх поля справа, поэтому у поля отступ справа
            под её ширину — иначе длинный пароль уходил бы под надпись. */}
        <div className="relative">
          <input
            id="password"
            name="password"
            type={isPasswordShown ? "text" : "password"}
            autoComplete="current-password"
            required
            className="input pr-24"
          />
          {/* type="button" обязателен: без него кнопка внутри формы
              отправляла бы её. aria-pressed сообщает скринридеру, что это
              переключатель и в каком он положении. */}
          <button
            type="button"
            onClick={() => setIsPasswordShown((shown) => !shown)}
            aria-pressed={isPasswordShown}
            aria-controls="password"
            className="text-ink/70 hover:text-accent rounded-pill absolute inset-y-0 right-0 px-4 text-sm"
          >
            {isPasswordShown ? "Скрыть" : "Показать"}
          </button>
        </div>
      </div>

      {/* Включена по умолчанию: в админку заходит одна художница со своего
          телефона или ноутбука. На чужом компьютере галочку снимают —
          тогда вход не переживёт закрытия браузера. */}
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" name="remember" defaultChecked className="accent-accent size-4" />
        Запомнить меня на 30 дней
      </label>

      {state.error && (
        // role="alert" — чтобы скринридер прочитал ошибку, а не оставил
        // человека гадать, почему форма не отправилась (.ai/rules/quality.md).
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" block disabled={isPending}>
        {isPending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
