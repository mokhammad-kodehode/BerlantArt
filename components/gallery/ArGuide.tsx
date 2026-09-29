"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Подготовка к камере (AR-4, TICKETS-ar.md): три шага с картинками
 * перед тем, как телефон откроет камеру.
 *
 * Появилась после проверки на iPhone: экран камеры принадлежит Apple
 * и Google, его подсказки мы менять не можем, а без подготовки человек
 * не понимает, почему картина полупрозрачная и куда вести телефон.
 * Так же делают магазины с примеркой (IKEA Place и другие).
 *
 * Сделана на <dialog>: браузер сам держит фокус внутри, закрывает по Esc
 * и прячет страницу под ним от скринридера.
 */

const seenKey = "ar-guide-seen";

/**
 * Видел ли человек подготовку на этом устройстве. Хранилище браузера
 * бывает закрыто (частный режим, запрет сайтов) — тогда считаем, что
 * не видел: показать лишний раз лучше, чем не показать вовсе.
 */
export function hasSeenArGuide(): boolean {
  try {
    return window.localStorage.getItem(seenKey) === "1";
  } catch {
    return false;
  }
}

export function rememberArGuide(): void {
  try {
    window.localStorage.setItem(seenKey, "1");
  } catch {
    // Хранилище закрыто — подготовка покажется снова. Это не поломка.
  }
}

type Step = { title: string; text: string; picture: "stand" | "sweep" | "drag" };

const steps: Step[] = [
  {
    title: "Встаньте напротив стены",
    text: "В полутора-двух метрах, при хорошем свете. Телефон держите ровно, на уровне глаз.",
    picture: "stand",
  },
  {
    title: "Медленно ведите телефоном",
    text: "Вправо и влево вдоль стены. Пока картина полупрозрачная, телефон ищет стену — станет плотной, когда найдёт.",
    picture: "sweep",
  },
  {
    title: "Передвиньте пальцем",
    text: "Проведите по картине, чтобы выбрать место. Размер не меняется — он настоящий.",
    picture: "drag",
  },
];

/** Схемы к шагам — линией, цвет от текста, как значки примерочной. */
function StepPicture({ name }: { name: Step["picture"] }) {
  return (
    <svg
      viewBox="0 0 120 72"
      aria-hidden="true"
      className="ar-guide-picture"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Стена спереди — во всех трёх. */}
      <rect x="8" y="4" width="104" height="44" rx="2" opacity={0.35} />

      {name === "stand" && (
        <>
          <rect
            x="48"
            y="12"
            width="24"
            height="24"
            rx="1"
            fill="currentColor"
            fillOpacity={0.25}
          />
          {/* Телефон перед стеной и что он видит. */}
          <rect x="54" y="52" width="12" height="18" rx="2.5" />
          <path d="M54 54 30 44M66 54l24-10" strokeDasharray="2 3" opacity={0.7} />
          <text x="72" y="66" fontSize="9" fill="currentColor" stroke="none">
            1,5–2 м
          </text>
          {/* Свет. */}
          <circle cx="22" cy="16" r="4" />
          <path d="M22 8v2M22 22v2M14 16h2M28 16h2" />
        </>
      )}

      {name === "sweep" && (
        <>
          {/* Картина ещё ищет стену — пунктиром. */}
          <rect x="48" y="12" width="24" height="24" rx="1" strokeDasharray="2.5 2.5" />
          <rect x="54" y="52" width="12" height="18" rx="2.5" />
          <path d="M46 61H32M36 57l-4 4 4 4M74 61h14M84 57l4 4-4 4" />
        </>
      )}

      {name === "drag" && (
        <>
          <rect
            x="22"
            y="12"
            width="24"
            height="24"
            rx="1"
            strokeDasharray="2.5 2.5"
            opacity={0.6}
          />
          <rect
            x="70"
            y="12"
            width="24"
            height="24"
            rx="1"
            fill="currentColor"
            fillOpacity={0.25}
          />
          <path d="M50 24h14M60 20l4 4-4 4" />
          {/* Палец на картине. */}
          <path d="M80 44V30a2.5 2.5 0 0 1 5 0v9l8 1.5a3.5 3.5 0 0 1 2.8 4.2L93 56H82l-6-8a2.6 2.6 0 0 1 4-3.3Z" />
        </>
      )}
    </svg>
  );
}

export function ArGuide({
  isOpen,
  photo,
  title,
  size,
  onStart,
  onClose,
}: {
  isOpen: boolean;
  /** Главное фото работы — карточка сверху, чтобы было видно, что примеряем. */
  photo: string;
  title: string;
  /** «Холст 60 × 60 см · в раме 74 × 74 см». */
  size: string;
  onStart: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (isOpen && !element.open) element.showModal();
    if (!isOpen && element.open) element.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialog}
      className="ar-guide"
      aria-labelledby="ar-guide-title"
      // Esc и системный «назад» закрывают диалог сами — сообщаем об этом наверх.
      onClose={onClose}
      // Нажатие мимо карточки — по затемнению — тоже закрывает.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ar-guide-card">
        <div className="ar-guide-work">
          <div className="ar-guide-thumb">
            <Image src={photo} alt="" fill sizes="56px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="ar-guide-kicker">Примерка через камеру</p>
            <h2 id="ar-guide-title" className="ar-guide-title">
              {title}
            </h2>
            <p className="ar-guide-size">{size}</p>
          </div>
        </div>

        <ol className="ar-guide-steps">
          {steps.map((step, index) => (
            <li key={step.picture} className="ar-guide-step">
              <StepPicture name={step.picture} />
              <div>
                <p className="ar-guide-step-title">
                  <span className="ar-guide-step-number">{index + 1}</span>
                  {step.title}
                </p>
                <p className="ar-guide-step-text">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="ar-guide-tip">
          Однотонную стену телефон находит дольше — захватите в кадр выключатель, угол или край
          мебели.
        </p>

        <div className="ar-guide-actions">
          <button type="button" className="room-cta" onClick={onStart}>
            Понятно, открыть камеру
          </button>
          <button type="button" className="room-cta" data-secondary onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </dialog>
  );
}
