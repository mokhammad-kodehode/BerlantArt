"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { BrushStroke } from "@/components/ui/BrushStroke";
import { Button } from "@/components/ui/Button";

/*
 * Три строки вступления, по очереди, пока распускается роза. Чеченские —
 * дословно от заказчика (16.10.2026), написание не правилось.
 */
const introLines = ["С днём рождения, мама!", "Дал декъал йойл", "Дал дукх ях йойл!"];

/*
 * Текст внутри открытки. Подпись — от заказчика; текст — черновик,
 * он правит его как хочет. Каждая строка — отдельный абзац.
 */
const greetingLines = [
  "Мама, сегодня твой день, и я хочу сказать то, что говорю реже, чем стоило бы.",
  "Спасибо тебе за тепло, за терпение, за мудрые слова и за то, что ты всегда рядом. Всё хорошее во мне — от тебя.",
  "Однажды ты взяла в руки кисть и не побоялась начать. Теперь твои картины видят люди, а я в каждой из них вижу тебя: твой свет, твою душу, твою тишину.",
  "Пусть Всевышний дарует тебе крепкое здоровье, долгие годы и радость в каждом дне. Пусть будет много света, покоя и новых холстов.",
  "Я очень тебя люблю.",
];
const signature = "Твой Мухаммад";

/*
 * Роза: кольца лепестков от края к сердцевине. Рисуются в этом порядке,
 * чтобы внутренние лежали поверх внешних, как у живой розы, — а
 * раскрываются наоборот: сердцевина первой, внешние лепестки последними
 * и шире всех. `scale` — размер лепестка, `turn` — поворот кольца, чтобы
 * лепестки соседних колец ложились в промежутки, `delay` — когда кольцо
 * начинает раскрываться, `tone` — шаг тонального ряда (класс `bday-tone-*`
 * в app/globals.css): снаружи светлее, к сердцевине гуще.
 */
const roseRings = [
  { count: 6, scale: 1, turn: 15, delay: 1.75, tone: "a200" },
  { count: 5, scale: 0.84, turn: 45, delay: 1.35, tone: "a300" },
  { count: 5, scale: 0.66, turn: 10, delay: 0.95, tone: "a400" },
  { count: 4, scale: 0.48, turn: 55, delay: 0.55, tone: "a500" },
  { count: 3, scale: 0.32, turn: 20, delay: 0.2, tone: "a600" },
] as const;

/*
 * Салют во вступлении: вспышки по краям экрана, чтобы не закрывать розу
 * и строки посередине. Каждая повторяется, пока идёт вступление; задержки
 * разные, и залпы не совпадают. `x`, `y` — место вспышки в процентах экрана.
 */
const bursts = [
  { x: 16, y: 22, delay: 2.4, tone: "a300" },
  { x: 84, y: 18, delay: 3, tone: "w" },
  { x: 26, y: 62, delay: 3.6, tone: "g300" },
  { x: 76, y: 58, delay: 4.1, tone: "a200" },
  { x: 50, y: 9, delay: 4.6, tone: "a400" },
  { x: 9, y: 42, delay: 5.1, tone: "w" },
  { x: 92, y: 40, delay: 5.5, tone: "a300" },
] as const;

/** Искр во вспышке: столько, чтобы она читалась кругом, а не пучком. */
const sparkCount = 18;

/** Лепесток растёт вверх от точки (0, 0) — центра розы: широкий, с округлым краем. */
const petalPath = "M0 0 C -28 -2 -34 -40 -8 -47 C -3 -48 3 -48 8 -47 C 34 -40 28 -2 0 0 Z";

/**
 * Капли краски, что падают по открытке. Положение, размер, задержка и цвет
 * (`a` — ряд акцента, `g` — зелёный ряд) заданы списком, а не случайно: случайные числа разошлись бы между
 * сервером и браузером, и React ругался бы на несовпадение разметки.
 */
const drops = [
  { x: 6, size: 14, delay: 0, tone: "a400" },
  { x: 14, size: 9, delay: 1.6, tone: "g400" },
  { x: 23, size: 18, delay: 0.7, tone: "a300" },
  { x: 31, size: 11, delay: 2.4, tone: "a600" },
  { x: 40, size: 15, delay: 1.1, tone: "g300" },
  { x: 49, size: 8, delay: 3, tone: "a500" },
  { x: 57, size: 16, delay: 0.3, tone: "a200" },
  { x: 65, size: 10, delay: 2, tone: "g500" },
  { x: 73, size: 19, delay: 1.3, tone: "a400" },
  { x: 81, size: 9, delay: 2.8, tone: "a300" },
  { x: 88, size: 13, delay: 0.5, tone: "g400" },
  { x: 95, size: 11, delay: 1.9, tone: "a600" },
] as const;

type DropStyle = CSSProperties & Record<"--x" | "--size" | "--delay", string>;
type IndexStyle = CSSProperties & Record<"--i", string>;
type BurstStyle = CSSProperties & Record<"--x" | "--y" | "--delay", string>;
type SparkStyle = CSSProperties & Record<"--a", string>;
type PetalStyle = CSSProperties & Record<"--delay", string>;

function lineStyle(index: number): IndexStyle {
  return { "--i": String(index) };
}

function dropStyle(drop: (typeof drops)[number]): DropStyle {
  return {
    "--x": `${drop.x}%`,
    "--size": `${drop.size}px`,
    "--delay": `${drop.delay}s`,
  };
}

function Fireworks() {
  return (
    <span className="bday-fireworks" aria-hidden>
      {bursts.map((burst) => {
        const style: BurstStyle = {
          "--x": `${burst.x}%`,
          "--y": `${burst.y}%`,
          "--delay": `${burst.delay}s`,
        };

        return (
          <span key={burst.delay} className={`bday-burst bday-tone-${burst.tone}`} style={style}>
            {Array.from({ length: sparkCount }, (_, index) => {
              const spark: SparkStyle = { "--a": `${(360 / sparkCount) * index}deg` };
              return <i key={index} style={spark} />;
            })}
          </span>
        );
      })}
    </span>
  );
}

function Rose({ className }: { className?: string }) {
  return (
    <svg viewBox="-60 -60 120 170" aria-hidden="true" className={className}>
      <path className="bday-rose-stem" d="M0 8 C 4 40 -6 70 2 104" />
      <path className="bday-rose-leaf" d="M1 58 C 16 46 32 50 38 40 C 26 36 10 42 1 58 Z" />
      <path className="bday-rose-leaf" d="M0 76 C -14 64 -30 68 -36 58 C -24 54 -9 60 0 76 Z" />
      {roseRings.map((ring) =>
        Array.from({ length: ring.count }, (_, index) => {
          const angle = ring.turn + (360 / ring.count) * index;
          const style: PetalStyle = {
            "--delay": `${ring.delay + index * 0.05}s`,
          };

          // Внешний <g> ставит лепесток на место, внутренний path
          // раскрывается: у анимации свой transform, и поворот затёр бы его.
          return (
            <g key={`${ring.scale}-${index}`} transform={`rotate(${angle}) scale(${ring.scale})`}>
              <path className={`bday-petal bday-tone-${ring.tone}`} d={petalPath} style={style} />
            </g>
          );
        }),
      )}
      {/* Сомкнутая сердцевина — завиток, а не ещё одно кольцо: у розы
          середина закручена, лепестков в ней не различить. */}
      <path
        className="bday-rose-core"
        d="M-1 -3 C 4 -8 8 -2 4 2 C 0 6 -7 2 -6 -4 C -5 -10 4 -13 9 -8"
      />
    </svg>
  );
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
 * Сначала вступление на весь экран: распускается роза, по краям вспыхивает
 * салют, по очереди появляются три строки поздравления. Потом раскрывается сама открытка —
 * обложка с розой откидывается, как у бумажной, а внутри картина
 * и письмо. Вся последовательность — на CSS-задержках (`bday-*`
 * в app/globals.css), без таймеров: скрытому окну браузер анимацию не
 * проигрывает и при каждом открытии начинает её сначала. Клик по
 * вступлению пропускает его сразу к открытке.
 *
 * Сервер рисует открытку только в те дни, когда она ждёт
 * (`birthdayCardYear` в lib/admin-cheer.ts), — в остальное время года её
 * кода на странице нет. Открывается сама при первом входе. Увидела —
 * браузер запоминает это по году, и дальше открытка не всплывает, но
 * остаётся кнопка «Открытка», чтобы перечитать.
 *
 * `isPreview` — просмотр по адресу `/admin?card` в любой день: открывается
 * всегда и ничего не запоминает, чтобы проверка заранее не «потратила»
 * настоящую открытку.
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
  const [isIntroSkipped, setIsIntroSkipped] = useState(false);

  function open(): void {
    setIsIntroSkipped(false);
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
        data-skipped={isIntroSkipped || undefined}
        className="bday"
      >
        <button
          type="button"
          onClick={() => setIsIntroSkipped(true)}
          aria-label="Сразу к открытке"
          className="bday-intro"
        >
          <Fireworks />
          <Rose className="bday-rose" />
          <span className="bday-intro-lines">
            {introLines.map((line, index) => (
              <span key={line} className="bday-intro-line" style={lineStyle(index)}>
                {line}
              </span>
            ))}
          </span>
        </button>

        <div
          className="bday-stage"
          // Клик по затемнению вокруг открытки закрывает её.
          onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
        >
          <div className="bday-card">
            <div className="bday-cover" aria-hidden>
              <Rose className="bday-cover-rose" />
            </div>

            <div className="bday-drops" aria-hidden>
              {drops.map((drop) => (
                <span key={drop.x} style={dropStyle(drop)} className={`bday-tone-${drop.tone}`} />
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
                  {/* key — чтобы при пропуске вступления мазок начался заново,
                      а не ждал прежней задержки. */}
                  <BrushStroke
                    key={String(isIntroSkipped)}
                    className="bday-stroke"
                    delay={isIntroSkipped ? 1.4 : 9.4}
                  />
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
        </div>
      </dialog>
    </>
  );
}
