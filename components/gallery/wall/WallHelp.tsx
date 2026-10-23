import { useRef } from "react";

import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/lib/i18n/client";

/**
 * Значок «i» в шапке редактора стены и инструкция по нему (заказчик,
 * 23.10.2026). В ней то, чего не видно из самого редактора и на чём
 * ошибаются: мерка должна лежать в той же стене (открытая дверь стоит
 * не в ней — картины выходят не того размера и с кривыми углами), размер
 * двери нужен настоящий, а широкоугольная камера гнёт края фото, чего
 * плоская стена в расчёте повторить не может.
 *
 * Окно — встроенный `<dialog>`, как в админке (DeleteArtwork): фокус,
 * Esc и возврат фокуса на значок браузер делает сам.
 */
export function WallHelp() {
  const t = useDictionary().room.wall;
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  // Фокус — на заголовок, а не на первую кнопку, как делает браузер:
  // «Понятно» стоит в самом низу, и на телефоне окно открывалось
  // прокрученным к ней, мимо начала инструкции. Скринридер так тоже
  // начинает с названия.
  function open(): void {
    dialog.current?.showModal();
    title.current?.focus();
  }

  return (
    <>
      <button
        type="button"
        className="wall-help"
        aria-label={t.helpLabel}
        title={t.helpLabel}
        onClick={open}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="7.9" r="1.15" className="wall-help-dot" />
          <path d="M12 11.2v5.6" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        className="dialog wall-help-dialog"
        aria-labelledby="wall-help-title"
        // Нажатие на затемнение вокруг окна закрывает его. Само окно без
        // полей, поэтому целью клика оно бывает только снаружи текста.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="wall-help-body">
          <h2 ref={title} id="wall-help-title" tabIndex={-1} className="wall-help-title">
            {t.helpTitle}
          </h2>
          <ol className="wall-help-steps">
            {t.helpSteps.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="wall-help-warn">{t.helpWarn}</p>
          <p className="wall-help-note">{t.helpNote}</p>
          <form method="dialog">
            <Button type="submit" variant="primary" size="lg" block>
              {t.helpClose}
            </Button>
          </form>
        </div>
      </dialog>
    </>
  );
}
