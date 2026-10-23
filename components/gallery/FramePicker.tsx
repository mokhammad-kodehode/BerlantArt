import { finishStyle } from "@/lib/frame-look";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { finishFor, frameModel, roomFrames, type FrameChoice } from "@/lib/room-options";

/**
 * Выбор рамы (TICKETS-primerka.md): ряд моделей и ряд цветов выбранной
 * модели. Один на экран «Картина и рама» и на картину в редакторе стены.
 *
 * Радиокнопки, а не просто кнопки: с клавиатуры ряд проходится стрелками
 * и скринридер говорит «3 из 7, выбрано». Образец модели показан в том
 * цвете, который достанется при её выборе, — у тонкой алюминиевой нет
 * «ореха», и образец не обещает его.
 */
export function FramePicker({
  choice,
  onChange,
  name,
}: {
  choice: FrameChoice;
  onChange: (choice: FrameChoice) => void;
  /** Имя группы радиокнопок: на странице их может быть несколько. */
  name: string;
}) {
  const t = useDictionary().room;
  const lang = useLocale();
  const model = frameModel(choice.frame);
  const width = new Intl.NumberFormat(lang).format(model.widthCm);

  return (
    <div className="frame-picker">
      <fieldset className="frame-picker-group">
        <legend className="frame-picker-legend">
          <span>{t.frame}</span>
          <span className="frame-picker-value">
            {choice.frame === "none"
              ? t.frames.none.note
              : t.frameSummary(t.frames[choice.frame].label, width)}
          </span>
        </legend>
        <div className="frame-models">
          {roomFrames.map((frame) => {
            const finish = finishFor(frame.id, choice.finish);
            return (
              <label key={frame.id} className="frame-model" title={t.frames[frame.id].note}>
                <input
                  type="radio"
                  name={`${name}-frame`}
                  value={frame.id}
                  checked={choice.frame === frame.id}
                  onChange={() => onChange({ frame: frame.id, finish })}
                />
                <span
                  aria-hidden="true"
                  className="swatch-frame"
                  data-frame={frame.id}
                  style={finishStyle(finish)}
                />
                <span className="frame-model-name">{t.frames[frame.id].short}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* У «без рамы» красить нечего — ряда цветов нет. */}
      {choice.frame !== "none" && (
        <fieldset className="frame-picker-group">
          <legend className="frame-picker-legend">
            <span>{t.frameColor}</span>
            <span className="frame-picker-value">{t.finishes[choice.finish]}</span>
          </legend>
          <div className="frame-finishes">
            {model.finishes.map((finish) => (
              <label key={finish} className="frame-finish" title={t.finishes[finish]}>
                <input
                  type="radio"
                  name={`${name}-finish`}
                  value={finish}
                  checked={choice.finish === finish}
                  onChange={() => onChange({ frame: choice.frame, finish })}
                  aria-label={t.finishes[finish]}
                />
                <span aria-hidden="true" className="swatch-finish" style={finishStyle(finish)} />
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
