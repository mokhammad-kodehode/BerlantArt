/**
 * Латунная подсветка для картины, вид спереди: круглое крепление на стене,
 * короткая ручка, рифлёный цилиндр с наконечниками и щель снизу, откуда
 * идёт свет.
 *
 * Нарисована векторно, а не фотографией: чужой снимок из примера заказчика
 * взять нельзя, а вектор чётко держится при любой ширине лампы — она
 * меняется вместе с размером картины. Цвета — переменные комнаты
 * (globals.css, .room), поэтому заданы через style: в атрибутах SVG
 * переменные CSS не работают.
 *
 * Щель светится только при включённом свете — это класс room-lamp-slot,
 * его зажигает CSS по атрибуту на комнате.
 */
export function PictureLamp() {
  const stop = (offset: number, color: string) => (
    <stop offset={offset} style={{ stopColor: `var(--${color})` }} />
  );
  // Рифление цилиндра — продольные полосы, как на лампе из примера.
  const flutes = Array.from({ length: 7 }, (_, index) => 62 + index * 3.6);

  return (
    <svg viewBox="0 0 400 104" aria-hidden="true">
      <defs>
        <linearGradient id="lamp-tube" x1="0" y1="0" x2="0" y2="1">
          {stop(0, "brass-shadow")}
          {stop(0.16, "brass-light")}
          {stop(0.27, "brass-shine")}
          {stop(0.44, "brass-mid")}
          {stop(0.72, "brass-shadow")}
          {stop(1, "brass-deep")}
        </linearGradient>
        <linearGradient id="lamp-arm" x1="0" y1="0" x2="1" y2="0">
          {stop(0, "brass-deep")}
          {stop(0.35, "brass-light")}
          {stop(0.5, "brass-shine")}
          {stop(0.72, "brass-mid")}
          {stop(1, "brass-deep")}
        </linearGradient>
        <radialGradient id="lamp-rose" cx="0.4" cy="0.35" r="0.7">
          {stop(0, "brass-shine")}
          {stop(0.35, "brass-light")}
          {stop(0.7, "brass-mid")}
          {stop(1, "brass-deep")}
        </radialGradient>
        <filter id="lamp-blur" x="-10%" y="-400%" width="120%" height="900%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* Крепление на стене: розетка с ободком из бусин и шляпкой в центре. */}
      <circle cx="200" cy="18" r="17" style={{ fill: "url(#lamp-rose)" }} />
      <circle
        cx="200"
        cy="18"
        r="12.5"
        style={{ fill: "none", stroke: "var(--brass-deep)", strokeWidth: 2.2 }}
        strokeDasharray="1.6 2.2"
      />
      <circle cx="200" cy="18" r="5" style={{ fill: "var(--brass-light)" }} />

      {/* Ручка с шарниром посередине. */}
      <rect x="196" y="30" width="8" height="30" style={{ fill: "url(#lamp-arm)" }} />
      <rect x="193" y="38" width="14" height="7" rx="2" style={{ fill: "url(#lamp-arm)" }} />

      {/* Цилиндр. */}
      <rect x="26" y="58" width="348" height="30" rx="4" style={{ fill: "url(#lamp-tube)" }} />
      {flutes.map((y, index) => (
        <line
          key={y}
          x1="30"
          x2="370"
          y1={y}
          y2={y}
          style={{
            stroke: index % 2 === 0 ? "var(--brass-deep)" : "var(--brass-shine)",
            strokeWidth: 0.8,
            opacity: index % 2 === 0 ? 0.45 : 0.3,
          }}
        />
      ))}
      <rect x="30" y="85" width="340" height="3" style={{ fill: "var(--brass-deep)" }} />

      {/* Наконечники: пояски и шишечки по краям. */}
      <rect x="16" y="55" width="14" height="36" rx="3" style={{ fill: "url(#lamp-tube)" }} />
      <rect x="370" y="55" width="14" height="36" rx="3" style={{ fill: "url(#lamp-tube)" }} />
      <rect
        x="29"
        y="56"
        width="3"
        height="34"
        style={{ fill: "var(--brass-shine)", opacity: 0.5 }}
      />
      <rect
        x="368"
        y="56"
        width="3"
        height="34"
        style={{ fill: "var(--brass-shine)", opacity: 0.5 }}
      />
      <ellipse cx="10" cy="73" rx="7" ry="9" style={{ fill: "url(#lamp-rose)" }} />
      <ellipse cx="390" cy="73" rx="7" ry="9" style={{ fill: "url(#lamp-rose)" }} />

      {/* Щель со светом: яркая нить и мягкий ореол вокруг неё. */}
      <g className="room-lamp-slot">
        <ellipse
          cx="200"
          cy="90"
          rx="176"
          ry="5"
          filter="url(#lamp-blur)"
          style={{ fill: "var(--room-light-warm)", opacity: 0.7 }}
        />
        <rect
          x="34"
          y="87.5"
          width="332"
          height="2"
          rx="1"
          style={{ fill: "var(--room-light-core)" }}
        />
      </g>
    </svg>
  );
}
