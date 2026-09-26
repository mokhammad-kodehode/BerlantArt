/**
 * Диван для масштаба в примерочной, вид спереди.
 *
 * Единица рисунка — сантиметр: viewBox 210 × 85 — это диван шириной
 * 210 см и высотой 85 см, обычный трёхместный. Поэтому CSS достаточно
 * задать ширину 210 × (пикселей в сантиметре), и диван встаёт в один
 * масштаб с холстом. Цвета — переменные комнаты (globals.css, .room),
 * через style: в атрибутах SVG переменные CSS не работают.
 *
 * Нейтральный серо-коричневый намеренно: диван — мерка, а не предмет
 * интерьера, и он не должен спорить ни со стеной, ни с картиной.
 */
export function RoomSofa() {
  const stop = (offset: number, color: string) => (
    <stop offset={offset} style={{ stopColor: `var(--${color})` }} />
  );

  return (
    <svg viewBox="0 0 210 85" aria-hidden="true">
      <defs>
        <linearGradient id="sofa-back" x1="0" y1="0" x2="0" y2="1">
          {stop(0, "sofa-light")}
          {stop(1, "sofa-dark")}
        </linearGradient>
        <linearGradient id="sofa-seat" x1="0" y1="0" x2="0" y2="1">
          {stop(0, "sofa-light")}
          {stop(0.35, "sofa-mid")}
          {stop(1, "sofa-dark")}
        </linearGradient>
        <linearGradient id="sofa-arm" x1="0" y1="0" x2="1" y2="0">
          {stop(0, "sofa-dark")}
          {stop(0.5, "sofa-light")}
          {stop(1, "sofa-dark")}
        </linearGradient>
      </defs>

      {/* Ножки — 10 см, диван стоит на полу, а не висит. */}
      <rect x="16" y="74" width="4" height="11" style={{ fill: "var(--sofa-leg)" }} />
      <rect x="190" y="74" width="4" height="11" style={{ fill: "var(--sofa-leg)" }} />

      {/* Спинка и две подушки на ней. */}
      <rect x="10" y="6" width="190" height="46" rx="9" style={{ fill: "url(#sofa-back)" }} />
      <rect x="22" y="12" width="81" height="34" rx="8" style={{ fill: "url(#sofa-back)" }} />
      <rect x="107" y="12" width="81" height="34" rx="8" style={{ fill: "url(#sofa-back)" }} />

      {/* Сиденье со швом между подушками. */}
      <rect x="4" y="44" width="202" height="32" rx="5" style={{ fill: "url(#sofa-seat)" }} />
      <line
        x1="105"
        x2="105"
        y1="46"
        y2="58"
        style={{ stroke: "var(--sofa-dark)", strokeWidth: 0.8 }}
      />

      {/* Подлокотники. */}
      <rect x="0" y="28" width="20" height="48" rx="8" style={{ fill: "url(#sofa-arm)" }} />
      <rect x="190" y="28" width="20" height="48" rx="8" style={{ fill: "url(#sofa-arm)" }} />
    </svg>
  );
}
