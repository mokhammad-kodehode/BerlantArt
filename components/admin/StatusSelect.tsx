"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";
import { changeStatus } from "@/lib/actions/status";
import { artworkStatuses, artworkStatusNames } from "@/lib/artwork-form";
import type { ArtworkStatus } from "@/lib/artworks";

/**
 * Статус работы в списке: выбрал — сохранилось, без кнопки «Применить».
 * Так попросил заказчик, и это честнее: лишний шаг в списке на десяток
 * работ превращается в десяток лишних нажатий.
 *
 * Кнопка при этом никуда не делась — она лежит в <noscript>. Без JavaScript
 * выбор в списке сам ничего не отправляет, и без кнопки статус было бы
 * не сменить вовсе; с JavaScript браузер её просто не показывает.
 */
export function StatusSelect({
  artworkId,
  title,
  status,
}: {
  artworkId: string;
  title: string;
  status: ArtworkStatus;
}) {
  return (
    <form action={changeStatus} className="flex items-center gap-2">
      <input type="hidden" name="id" value={artworkId} />
      <label htmlFor={`status-${artworkId}`} className="sr-only">
        Статус работы «{title}»
      </label>
      {/* key со статусом внутри — не украшение. defaultValue у select
          действует только при первом появлении элемента: после смены
          статуса список показывал бы прежнее значение, хотя в базе уже
          новое. Та же ловушка, что в форме работы (Э6-2а). */}
      <select
        key={`${artworkId}-${status}`}
        id={`status-${artworkId}`}
        name="status"
        className="input w-auto"
        defaultValue={status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {artworkStatuses.map((value) => (
          <option key={value} value={value}>
            {artworkStatusNames[value]}
          </option>
        ))}
      </select>

      <StatusFeedback />
    </form>
  );
}

/**
 * Отметка «Сохраняем…» во время отправки и запасная кнопка без JavaScript.
 *
 * Отдельным компонентом, потому что useFormStatus читает состояние только
 * той формы, которая выше по дереву: в самом компоненте формы он всегда
 * вернул бы «не отправляется».
 */
function StatusFeedback() {
  const { pending } = useFormStatus();

  if (pending) {
    return (
      <span role="status" className="text-ink/75 text-sm">
        Сохраняем…
      </span>
    );
  }

  return (
    <noscript>
      <Button type="submit" variant="ghost">
        Применить
      </Button>
    </noscript>
  );
}
