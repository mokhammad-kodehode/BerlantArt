import { getDictionary, type Locale } from "@/lib/i18n";

/**
 * Экран, пока примерочная собирается (заказчик, 23.10.2026: «немного
 * думает страница»). В первый раз её страница готовится на сервере —
 * запрос в базу, сборка, — дальше отдаётся готовой и открывается сразу
 * (TICKETS-primerka.md, решение 4). Этот экран Next показывает мгновенно,
 * по нажатию на значок, а не после ответа сервера.
 *
 * Та же раскладка, что у примерочной (`.fit`): когда она придёт, ничего
 * не прыгает. На месте картины — значок примерки, рамка на гвоздике,
 * качается, как на табличке (globals.css, .room-loading). Без лишних
 * слов и без счётчиков: ждать здесь секунду-две.
 *
 * Под страницей работы скелета нет — только у примерочной: там статус
 * 404 у несуществующей работы важен поисковику, а примерочная закрыта
 * от индекса (комментарий в app/(ru)/gallery/(list)/search/loading.tsx).
 */
export function RoomLoading({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);

  return (
    <main>
      <div className="fit" aria-busy="true">
        <header className="fit-bar">
          <span aria-hidden className="fit-back room-loading-pill" />
          <p className="fit-title">
            <span className="fit-title-main">{t.room.heading}</span>
          </p>
        </header>

        <div className="fit-stage">
          <div className="room-loading" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="room-loading-icon">
              <g className="room-loading-frame">
                <path d="M12 2.6 6.4 8.6M12 2.6l5.6 6" />
                <rect x="3.5" y="8.6" width="17" height="12.4" rx="0.6" />
                <path d="m6.5 18 3.4-3.6 2.4 2.3 2-1.9 3.2 3.2" />
                <circle cx="15.6" cy="12" r="1.1" />
              </g>
              <circle cx="12" cy="2.6" r="1.2" className="room-loading-nail" />
            </svg>
            <span>{t.roomLoading}</span>
          </div>
        </div>

        <div className="fit-panel" aria-hidden>
          <span className="room-loading-line" style={{ width: "62%" }} />
          <span className="room-loading-line" style={{ width: "100%", height: 64 }} />
          <span className="room-loading-line" style={{ width: "46%" }} />
          <span className="room-loading-line" style={{ width: "100%", height: 52 }} />
        </div>
      </div>
    </main>
  );
}
