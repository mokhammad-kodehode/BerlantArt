import type { CSSProperties } from "react";

import { FramedPainting } from "@/components/gallery/FramedPainting";
import { Arrow } from "@/components/ui/Arrow";
import { ButtonLink } from "@/components/ui/Button";
import { hangPath, type FittingWork } from "@/lib/fitting-works";
import type { CssVars } from "@/lib/frame-look";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import {
  canvasCmText,
  finishFor,
  framedCanvas,
  type FrameChoice,
  type RoomFrame,
} from "@/lib/room-options";

/**
 * Рамы, которые сменяют друг друга на стене: без рамы, тонкая, багет,
 * барокко — от самой простой к самой пышной. Покрытие — золото, где
 * у рамы оно есть.
 */
const teaserFrameIds: RoomFrame[] = ["none", "thin", "classic", "baroque"];
const teaserFrames: FrameChoice[] = teaserFrameIds.map((frame) => ({
  frame,
  finish: finishFor(frame, "gold"),
}));

/** Номер рамы в очереди — от него CSS считает, когда ей проявиться. */
function turn(index: number): CSSProperties & CssVars {
  return { "--i": index };
}

/**
 * Секция «Повесить у себя» на главной (вариант «А», заказчик, 23.10.2026):
 * картина висит на гвоздике, а рамы сменяют друг друга раз в три секунды,
 * с размером в раме. Показывает главное — раму и размер — без слов и ведёт
 * на /hang.
 *
 * Рамы — настоящие, тем же FramedPainting, что в примерочной: багет здесь
 * ровно тот, что человек увидит при примерке. Все четыре лежат стопкой
 * и проявляются по очереди (CSS, globals.css, .hang-teaser); фото одно —
 * браузер скачивает его один раз.
 *
 * Серверный: движения без состояния, только CSS. При «меньше движения»
 * картина не качается, а рамы просто проявляются — проявление движением
 * не считается.
 */
export function HangTeaser({ lang, work }: { lang: Locale; work: FittingWork }) {
  const t = getDictionary(lang);

  return (
    <section aria-labelledby="home-hang-title" className="hang-teaser">
      <div className="hang-teaser-inner">
        <div className="hang-teaser-text">
          <span className="text-accent mb-3 block text-[13px] font-semibold tracking-[0.1em] uppercase">
            {t.nav.hang}
          </span>
          <h2
            id="home-hang-title"
            className="text-ink m-0 text-[clamp(32px,3.6vw,46px)] leading-[1.08]"
          >
            {t.home.hangTitle}
          </h2>
          <p className="text-ink-soft mt-5 mb-0 max-w-[46ch] text-[16px] leading-relaxed md:text-[17px]">
            {t.home.hangText}
          </p>
        </div>

        <div className="hang-teaser-cta">
          <ButtonLink href={localePath(lang, hangPath)} variant="primary" size="lg">
            {t.nav.hang} <Arrow />
          </ButtonLink>
          <p className="text-ink-faint mt-4 mb-0 text-[13px] leading-snug">{t.home.hangPrivacy}</p>
        </div>

        <div className="hang-teaser-wall" role="img" aria-label={t.home.hangArt(work.title)}>
          <span aria-hidden="true" className="hang-teaser-nail" />
          <div aria-hidden="true" className="hang-teaser-swing">
            {teaserFrames.map((choice, index) => (
              <div key={choice.frame} className="hang-teaser-layer" style={turn(index)}>
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="hang-teaser-wire">
                  <path d="M100 0 6 40M100 0l94 40" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="hang-teaser-art">
                  <FramedPainting
                    src={work.src}
                    alt=""
                    choice={choice}
                    canvas={work.canvas}
                    sizes="(max-width: 1023px) 70vw, 360px"
                  />
                </div>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="hang-teaser-labels">
            {teaserFrames.map((choice, index) => (
              <span key={choice.frame} className="hang-teaser-label" style={turn(index)}>
                <b>{t.room.frames[choice.frame].label}</b> ·{" "}
                {choice.frame === "none"
                  ? t.room.canvasSize(canvasCmText(work.canvas, t.room.cm))
                  : canvasCmText(framedCanvas(work.canvas, choice.frame), t.room.cm)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
