import { describe, expect, it } from "vitest";

import {
  defaultRoomOptions,
  finishFor,
  framedSides,
  parseCanvasSides,
  parseRoomOptions,
  roomFrames,
  roomMessage,
  roomQuery,
  type RoomOptions,
} from "@/lib/room-options";

/**
 * Примерочная хранит выбор в адресе, и ссылку на неё пересылают в
 * мессенджерах. Ломается это незаметно: опечатка в старой ссылке роняет
 * страницу, лишние параметры раздувают адрес, неподходящее покрытие даёт
 * раму, которой не бывает, а неверно прочитанный размер рисует картину
 * не того масштаба над диваном — по этой картинке покупатель решает,
 * впишется ли холст в его комнату.
 */
describe("parseRoomOptions", () => {
  it("без параметров отдаёт значения по умолчанию", () => {
    expect(parseRoomOptions({})).toEqual(defaultRoomOptions);
  });

  it("читает выбор из адреса", () => {
    expect(
      parseRoomOptions({
        frame: "thin",
        finish: "navy",
        wall: "olive",
        light: "day",
        sofa: "1",
      }),
    ).toEqual({ frame: "thin", finish: "navy", wall: "olive", light: "day", hasSofa: true });
  });

  it("мусор откатывает к умолчанию, а не роняет страницу", () => {
    expect(
      parseRoomOptions({
        frame: "purple",
        finish: "rainbow",
        wall: "",
        light: "night",
        sofa: "yes",
      }),
    ).toEqual(defaultRoomOptions);
  });

  it("без покрытия берёт основное покрытие модели", () => {
    expect(parseRoomOptions({ frame: "floater" }).finish).toBe("black");
  });

  it("покрытие, которого у модели нет, заменяет основным", () => {
    // Тонкая алюминиевая рама из ореха не бывает.
    expect(parseRoomOptions({ frame: "thin", finish: "walnut" }).finish).toBe("black");
  });

  it("из повторённого параметра берёт первый", () => {
    expect(parseRoomOptions({ frame: ["modern", "thin"] }).frame).toBe("modern");
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

describe("roomQuery", () => {
  it("для выбора по умолчанию даёт пустую строку — ссылка остаётся чистой", () => {
    expect(roomQuery(defaultRoomOptions)).toBe("");
  });

  it("пишет только то, что отличается от умолчаний", () => {
    expect(roomQuery({ ...defaultRoomOptions, wall: "olive" })).toBe("?wall=olive");
  });

  it("основное покрытие модели в адрес не пишет", () => {
    expect(roomQuery({ ...defaultRoomOptions, frame: "floater", finish: "black" })).toBe(
      "?frame=floater",
    );
  });

  it("то, что записано, читается обратно тем же", () => {
    const options: RoomOptions = {
      frame: "modern",
      finish: "cherry",
      wall: "graphite",
      light: "day",
      hasSofa: true,
    };
    const params = Object.fromEntries(new URLSearchParams(roomQuery(options)));

    expect(parseRoomOptions(params)).toEqual(options);
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

describe("roomMessage", () => {
  it("называет работу, раму с покрытием и стену и прикладывает ссылку", () => {
    const text = roomMessage(
      "Село",
      { ...defaultRoomOptions, frame: "thin", finish: "black", wall: "olive" },
      "https://example.test/gallery/1/room?frame=thin&wall=olive",
    );

    expect(text).toBe(
      "Здравствуйте! Интересует работа «Село». Смотрю её в раме «Тонкая», чёрная, на оливковой стене. https://example.test/gallery/1/room?frame=thin&wall=olive",
    );
  });

  it("без рамы так и пишет", () => {
    expect(roomMessage("Село", { ...defaultRoomOptions, frame: "none" }, "")).toContain(
      "без рамы, на бежевой стене",
    );
  });
});
