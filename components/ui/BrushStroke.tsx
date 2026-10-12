import { useId } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

/**
 * Ворсинки мастихина: из них маска собирает мазок по мере движения.
 *
 * У каждой своя высота (y), толщина (w), задержка старта (delay, доля
 * от общего времени) и точка, где она отрывается от холста (end, из 200).
 * Центральные идут первыми и дальше всех — на них давление; крайние
 * отстают и обрываются раньше, к концу краски на них не хватает. Отсюда
 * неровный передний край и сухой хвост — то, чем мазок отличается от заливки.
 */
const bristles = [
  { y: 9.5, w: 3, delay: 0.1, end: 172 },
  { y: 12.5, w: 4.5, delay: 0.04, end: 194 },
  { y: 16, w: 5.5, delay: 0, end: 199 },
  { y: 20, w: 6, delay: 0, end: 201 },
  { y: 24, w: 5.5, delay: 0.03, end: 193 },
  { y: 27.5, w: 4.5, delay: 0.07, end: 184 },
  { y: 30.5, w: 3, delay: 0.12, end: 156 },
];

type BristleStyle = CSSProperties & Record<"--delay" | "--dur", string>;

/**
 * Мазок мастихина под текущим пунктом меню.
 *
 * Положение и размер задаёт вызывающая сторона классом (`className`), здесь —
 * только сам мазок. `duration` — общее время нанесения в секундах, ворсинки
 * укладываются в него; `delay` — пауза перед касанием.
 *
 * Слои:
 * - силуэт: густой в начале, сходит на нет к концу, с сухим хвостом —
 *   задаёт итоговую форму;
 * - маска: касание (пятно в начале — мастихин лёг на холст) и семь
 *   ворсинок, которые протягивают краску каждая в своём темпе
 *   (анимация stroke-dashoffset, app/globals.css, `.nav-bristle`);
 * - фильтр поверх маски: вытянутый шум рвёт края и даёт полосы ворса,
 *   а боковой свет по тому же шуму — блики на гребнях краски, объём
 *   вместо плоской заливки. Фильтр снаружи маски, чтобы рваным был и
 *   передний край, пока мазок движется.
 *
 * Идентификаторы — через useId: мазков на странице бывает несколько
 * (меню компьютера и телефона), одинаковые id ссылались бы на чужой фильтр.
 */
export function BrushStroke({
  className,
  duration = 0.9,
  delay = 0.12,
}: {
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const id = useId();
  const [texture, reveal] = [`${id}-t`, `${id}-r`];

  return (
    <svg
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("brush-stroke", className)}
    >
      <defs>
        {/* Область — в единицах рисунка: по умолчанию она считается от рамки
            содержимого, а та в начале анимации пуста, и фильтр обрезал бы всё. */}
        <filter
          id={texture}
          filterUnits="userSpaceOnUse"
          x="-10"
          y="-10"
          width="220"
          height="60"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.55"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
            result="ragged"
          />
          {/* Прозрачность из шума: от 0.5 до 1 — полосы, где ворс
              оставил краски меньше. */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.1 0 0 0 0.35"
            result="bristles"
          />
          <feComposite in="ragged" in2="bristles" operator="in" result="paint" />
          {/* Рельеф краски: тот же шум как карта высот, свет слева сверху. */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"
            result="relief"
          />
          <feSpecularLighting
            in="relief"
            surfaceScale="3"
            specularConstant="0.9"
            specularExponent="18"
            lightingColor="#fff"
            result="shine"
          >
            <feDistantLight azimuth="225" elevation="42" />
          </feSpecularLighting>
          <feComposite in="shine" in2="paint" operator="in" result="gloss" />
          <feComposite in="paint" in2="gloss" operator="arithmetic" k2="1" k3="0.32" />
        </filter>
        <mask id={reveal} maskUnits="userSpaceOnUse" x="-10" y="0" width="220" height="40">
          <ellipse
            className="nav-touch"
            style={{ animationDelay: `${Math.max(delay - 0.04, 0)}s` }}
            cx="12"
            cy="20"
            rx="12"
            ry="12"
            fill="#fff"
          />
          {bristles.map((bristle) => {
            const style: BristleStyle = {
              "--delay": `${delay + bristle.delay * duration}s`,
              // Короткая ворсинка проходит свой путь за меньшее время, но
              // с той же скоростью — иначе она догоняла бы длинные.
              "--dur": `${(duration * 0.78 * bristle.end) / 200}s`,
            };
            return (
              <path
                key={bristle.y}
                className="nav-bristle"
                style={style}
                pathLength={1}
                d={`M-2 ${bristle.y + 1}C60 ${bristle.y} 120 ${bristle.y - 0.8} ${bristle.end} ${bristle.y - 1.2}`}
                fill="none"
                stroke="#fff"
                strokeWidth={bristle.w}
                strokeLinecap="round"
              />
            );
          })}
        </mask>
      </defs>
      <g filter={`url(#${texture})`}>
        <g mask={`url(#${reveal})`} fill="currentColor">
          {/* Тело мазка: 23 единицы высоты в начале, 9 — в конце */}
          <path d="M6 17C4 10 14 7 26 8C70 9 120 10 168 12C181 12.6 191 14 195 17C191 19.3 183 20.3 175 21C130 24 80 28 30 31C16 32 6 28 5 22Z" />
          {/* Сухой хвост: ворсинки, оторвавшиеся от тела */}
          <path d="M140 24.2C160 23.4 180 22.9 198 22.6L198 23.8C180 24.3 160 25 140 25.6Z" />
          <path d="M120 27.4C150 26.4 172 26 190 25.8L190 26.7C172 27 150 27.6 120 28.4Z" />
          <path d="M150 9.6C170 10 186 10.6 197 11.4L196.6 12.3C185 11.6 170 11.1 150 10.7Z" />
        </g>
      </g>
    </svg>
  );
}
