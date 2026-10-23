import { describe, expect, it } from "vitest";

import { ruUi } from "@/lib/i18n/ru-ui";

import {
  defaultFrameChoice,
  finishFor,
  fittingMessage,
  frameFinish,
  framedSides,
  frameQuery,
  normalizeCanvasSize,
  parseCanvasSides,
  parseFrameChoice,
  roomFrames,
  type FrameChoice,
} from "@/lib/room-options";

/**
 * Примерочная хранит выбор рамы в адресе, и ссылку на неё пересылают в
 * мессенджерах. Ломается это незаметно: опечатка в старой ссылке роняет
 * страницу, лишние параметры раздувают адрес, неподходящее покрытие даёт
 * раму, которой не бывает, а неверно прочитанный размер рисует картину
 * не того масштаба на стене — по этой картинке покупатель решает,
 * впишется ли холст в его комнату.
 */
describe("parseFrameChoice", () => {
  it("без параметров отдаёт картину без рамы", () => {
    expect(parseFrameChoice({})).toEqual(defaultFrameChoice);
    expect(parseFrameChoice({}).frame).toBe("none");
  });

  it("читает выбор из адреса", () => {
    expect(parseFrameChoice({ frame: "thin", finish: "navy" })).toEqual({
      frame: "thin",
      finish: "navy",
    });
  });

  it("мусор откатывает к умолчанию, а не роняет страницу", () => {
    expect(parseFrameChoice({ frame: "purple", finish: "rainbow" })).toEqual(defaultFrameChoice);
  });

  it("параметры старой примерочной не мешают", () => {
    // Стены, свет и диван были до 23.10.2026 — такие ссылки ещё ходят.
    expect(parseFrameChoice({ frame: "thin", wall: "olive", light: "evening", sofa: "1" })).toEqual(
      { frame: "thin", finish: "black" },
    );
  });

  it("без покрытия берёт основное покрытие модели", () => {
    expect(parseFrameChoice({ frame: "floater" }).finish).toBe("black");
  });

  it("покрытие, которого у модели нет, заменяет основным", () => {
    // Тонкая алюминиевая рама из ореха не бывает.
    expect(parseFrameChoice({ frame: "thin", finish: "walnut" }).finish).toBe("black");
  });

  it("из повторённого параметра берёт первый", () => {
    expect(parseFrameChoice({ frame: ["modern", "thin"] }).frame).toBe("modern");
  });

  it("читает и то, что отдаёт браузер: пустой параметр — null", () => {
    const params = new URLSearchParams("?frame=classic");
    expect(parseFrameChoice({ frame: params.get("frame"), finish: params.get("finish") })).toEqual({
      frame: "classic",
      finish: "gold",
    });
  });
});

describe("finishFor", () => {
  it("оставляет покрытие, если модель его знает", () => {
    expect(finishFor("classic", "silver")).toBe("silver");
  });

  it("иначе даёт первое покрытие модели", () => {
    expect(finishFor("baroque", "navy")).toBe("old-gold");
  });

  it("у каждой модели, кроме «без рамы», покрытия есть", () => {
    for (const frame of roomFrames) {
      if (frame.id === "none") continue;
      expect(frame.finishes.length, frame.id).toBeGreaterThan(0);
    }
  });
});

describe("frameQuery", () => {
  it("для выбора по умолчанию даёт пустую строку — ссылка остаётся чистой", () => {
    expect(frameQuery(defaultFrameChoice)).toBe("");
  });

  it("основное покрытие модели в адрес не пишет", () => {
    expect(frameQuery({ frame: "floater", finish: "black" })).toBe("?frame=floater");
  });

  it("то, что записано, читается обратно тем же", () => {
    const choice: FrameChoice = { frame: "modern", finish: "cherry" };
    const params = Object.fromEntries(new URLSearchParams(frameQuery(choice)));

    expect(parseFrameChoice(params)).toEqual(choice);
  });
});

describe("тона покрытий", () => {
  it("идут от тени к блику — иначе профиль рамы вывернется наизнанку", () => {
    // Яркость по формуле ITU-R BT.601: тёмное — меньше.
    const brightness = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const finish of new Set(roomFrames.flatMap((frame) => frame.finishes))) {
      const { deep, shadow, mid, light, shine } = frameFinish(finish).tones;
      const row = [deep, shadow, mid, light, shine].map(brightness);
      expect(row, finish).toEqual([...row].sort((a, b) => a - b));
    }
  });
});

describe("parseCanvasSides", () => {
  it("читает размер из списка админки", () => {
    expect(parseCanvasSides("40 × 50 см")).toEqual({ short: 40, long: 50 });
  });

  it("понимает латинскую и русскую «х» и размер без единицы", () => {
    expect(parseCanvasSides("60x80")).toEqual({ short: 60, long: 80 });
    expect(parseCanvasSides("60 х 80 см")).toEqual({ short: 60, long: 80 });
  });

  it("понимает размер, вписанный от руки: через косую черту, звёздочку, «на»", () => {
    // «120/120» стояло у работы на сайте — без этого у неё не было камеры.
    expect(parseCanvasSides("120/120")).toEqual({ short: 120, long: 120 });
    expect(parseCanvasSides("50*60 см.")).toEqual({ short: 50, long: 60 });
    expect(parseCanvasSides("50 на 70 см")).toEqual({ short: 50, long: 70 });
  });

  it("стороны упорядочены: ориентацию решает фотография, а не строка", () => {
    expect(parseCanvasSides("50 × 40 см")).toEqual({ short: 40, long: 50 });
  });

  it("не угадывает, если уверенности нет", () => {
    expect(parseCanvasSides(null)).toBeNull();
    expect(parseCanvasSides("большая")).toBeNull();
    // Миллиметры и метры — не сантиметры: диван вышел бы в десять раз не того размера.
    expect(parseCanvasSides("400 × 500 мм")).toBeNull();
    expect(parseCanvasSides("0 × 50 см")).toBeNull();
  });
});

describe("normalizeCanvasSize", () => {
  it("приводит размер к виду списка админки, не меняя порядок сторон", () => {
    expect(normalizeCanvasSize("120/120")).toBe("120 × 120 см");
    expect(normalizeCanvasSize(" 70x50 ")).toBe("70 × 50 см");
    expect(normalizeCanvasSize("35,5 на 45 см")).toBe("35,5 × 45 см");
    expect(normalizeCanvasSize("40 × 50 см")).toBe("40 × 50 см");
  });

  it("непонятную строку не трогает — додумывать размер нельзя", () => {
    expect(normalizeCanvasSize(" диптих, 2 × 30 × 40 ")).toBe("диптих, 2 × 30 × 40");
    expect(normalizeCanvasSize("400 × 500 мм")).toBe("400 × 500 мм");
  });
});

describe("framedSides", () => {
  it("прибавляет по две ширины рамы к каждой стороне", () => {
    // Классический багет 7 см: 50 + 14 = 64.
    expect(framedSides({ short: 50, long: 50 }, "classic")).toEqual({ short: 64, long: 64 });
  });

  it("у парящей рамы учитывает и зазор", () => {
    // 1.5 см рамы и 0.8 см зазора с каждой стороны: 40 + 4.6 ≈ 45.
    expect(framedSides({ short: 40, long: 60 }, "floater")).toEqual({ short: 45, long: 65 });
  });

  it("без рамы размер не меняется", () => {
    expect(framedSides({ short: 30, long: 40 }, "none")).toEqual({ short: 30, long: 40 });
  });
});

describe("fittingMessage", () => {
  const url = "https://example.test/gallery/1";

  it("из камеры называет работу и раму с покрытием и прикладывает ссылку", () => {
    expect(
      fittingMessage({
        works: [{ title: "Село", choice: { frame: "thin", finish: "black" }, url }],
        place: "camera",
        t: ruUi.room,
      }),
    ).toBe(
      "Здравствуйте! Смотрю у себя на стене, через камеру: «Село» в раме «Тонкая», чёрная. https://example.test/gallery/1",
    );
  });

  it("с фото стены перечисляет все картины и их ссылки", () => {
    const text = fittingMessage({
      works: [
        { title: "Село", choice: { frame: "classic", finish: "gold" }, url },
        { title: "Башня", choice: defaultFrameChoice, url: "https://example.test/gallery/2" },
      ],
      place: "photo",
      t: ruUi.room,
    });

    expect(text).toBe(
      "Здравствуйте! Смотрю у себя на стене, по фото: «Село» в раме «Классический багет», золото; «Башня» без рамы. https://example.test/gallery/1 https://example.test/gallery/2",
    );
  });
});
