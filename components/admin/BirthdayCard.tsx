"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { BrushStroke } from "@/components/ui/BrushStroke";
import { Button } from "@/components/ui/Button";

/*
 * Текст открытки. Черновик — сын художницы правит его как хочет
 * (заказчик, 16.10.2026). Каждая строка — отдельный абзац.
 */
const greetingLines = [
  "Спасибо тебе за тепло, за терпение и за всё, что ты для нас делаешь.",
  "Однажды ты взяла в руки кисть и не побоялась начать. Теперь твои картины может увидеть весь мир — и в каждой из них есть частичка тебя.",
  "Пусть этот год будет светлым, здоровым и щедрым на новые холсты.",
  "Я тебя очень люблю.",
];
const signature = "Твой сын";

/**
 * Капли краски, что падают по открытке. Положение, размер, задержка и цвет
 * заданы списком, а не случайно: случайные числа разошлись бы между
 * сервером и браузером, и React ругался бы на несовпадение разметки.
 */
const drops = [
  { x: 6, size: 14, delay: 0, tone: "accent-400" },
  { x: 14, size: 9, delay: 1.6, tone: "accent-2-400" },
  { x: 23, size: 18, delay: 0.7, tone: "accent-300" },
  { x: 31, size: 11, delay: 2.4, tone: "accent-600" },
  { x: 40, size: 15, delay: 1.1, tone: "accent-2-300" },
  { x: 49, size: 8, delay: 3, tone: "accent-500" },
  { x: 57, size: 16, delay: 0.3, tone: "accent-200" },
  { x: 65, size: 10, delay: 2, tone: "accent-2-500" },
  { x: 73, size: 19, delay: 1.3, tone: "accent-400" },
  { x: 81, size: 9, delay: 2.8, tone: "accent-300" },
  { x: 88, size: 13, delay: 0.5, tone: "accent-2-400" },
  { x: 95, size: 11, delay: 1.9, tone: "accent-600" },
] as const;

type DropStyle = CSSProperties & Record<"--x" | "--size" | "--delay" | "--tone", string>;

function dropStyle(drop: (typeof drops)[number]): DropStyle {
  return {
    "--x": `${drop.x}%`,
    "--size": `${drop.size}px`,
    "--delay": `${drop.delay}s`,
    "--tone": `var(--color-${drop.tone})`,
  };
}

/** Ключ в браузере: «открытку этого года уже видела». */
function seenKey(year: number): string {
  return `birthday-card-seen-${year}`;
}

function hasSeen(year: number): boolean {
  try {
    return localStorage.getItem(seenKey(year)) !== null;
  } catch {
    // Браузер не дал хранилище (приватный режим) — покажем открытку:
    // увидеть её дважды лучше, чем не увидеть вовсе.
    return false;
  }
}

function markSeen(year: number): void {
  try {
    localStorage.setItem(seenKey(year), "1");
  } catch {
    // Не запомнили — откроется ещё раз при следующем входе. Не беда.
  }
}

/**
 * Открытка ко дню рождения художницы (заказчик, 16.10.2026).
 *
 * Сервер рисует её только в те дни, когда она ждёт (`birthdayCardYear`
 * в lib/admin-cheer.ts), — в остальное время года её кода на странице нет.
 * Открывается сама при первом входе. Увидела — браузер запоминает это по
 * году, и дальше открытка не всплывает, но остаётся кнопка «Открытка»,
 * чтобы перечитать.
 *
 * `isPreview` — просмотр по адресу `/admin?card` в любой день: открывается
 * всегда и ничего не запоминает, чтобы проверка заранее не «потратила»
 * настоящую открытку.
 *
 * Мазок и капли анимируются при каждом открытии сами: закрытое окно
 * скрыто целиком, а скрытому браузер анимацию не проигрывает и при
 * появлении начинает её с начала.
 */
export function BirthdayCard({
  year,
  isPreview,
  painting,
}: {
  year: number;
  isPreview: boolean;
  painting?: { src: string; title: string };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open(): void {
    dialogRef.current?.showModal();
    if (!isPreview) markSeen(year);
  }

  // Открывается сама при входе, если в этом году её ещё не видели.
  useEffect(() => {
    const dialog = dialogRef.current;
    // Уже открыта — в разработке React запускает эффект дважды.
    if (dialog === null || dialog.open || (!isPreview && hasSeen(year))) return;
    dialog.showModal();
    if (!isPreview) markSeen(year);
  }, [isPreview, year]);

  return (
    <>
      <Button type="button" variant="soft" onClick={open}>
        Открытка
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="birthday-title"
        // Клик по затемнению вокруг открытки приходит в само окно.
        onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
        className="bday"
      >
        <div className="bday-card">
          <div className="bday-drops" aria-hidden>
            {drops.map((drop) => (
              <span key={drop.x} style={dropStyle(drop)} />
            ))}
          </div>

          {painting !== undefined && (
            <div className="bday-art">
              <Image
                src={painting.src}
                alt={painting.title}
                fill
                sizes="(min-width: 768px) 400px, 90vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="bday-body">
            <p className="bday-date">26 марта</p>
            <h2 id="birthday-title" className="bday-title">
              С днём рождения,{" "}
              <span className="relative inline-block whitespace-nowrap">
                <BrushStroke className="bday-stroke" delay={0.5} duration={1.2} />
                <span className="relative">мама!</span>
              </span>
            </h2>

            {greetingLines.map((line) => (
              <p key={line} className="bday-line">
                {line}
              </p>
            ))}

            <p className="bday-sign">{signature} ♥</p>

            <Button
              type="button"
              variant="primary"
              onClick={() => dialogRef.current?.close()}
              className="mt-6"
            >
              Спасибо!
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
