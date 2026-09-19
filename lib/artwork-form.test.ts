import { describe, expect, it } from "vitest";

import {
  artworkStatuses,
  customSize,
  dimensionsFields,
  firstYear,
  parseArtworkForm,
  readArtworkForm,
} from "@/lib/artwork-form";
import type { ArtworkInput } from "@/lib/artworks";
import { ArtworkStatus } from "@/lib/generated/prisma/enums";

/**
 * Разбор данных формы — чужой ввод, и ошибка в нём глазами не видна:
 * форма сохранится, а в базе окажется не то, что набрали.
 */

/** Заполненная форма по умолчанию — в тестах меняется одно поле. */
function form(overrides: Record<string, string> = {}, withFeatured = false): FormData {
  const data = new FormData();
  const values: Record<string, string> = {
    title: "Башни в тумане",
    description: "",
    category: "",
    technique: "",
    dimensions: "",
    year: "",
    price: "",
    status: "AVAILABLE",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) data.set(key, value);
  if (withFeatured) data.set("featured", "on");

  return data;
}

const parse = (overrides?: Record<string, string>, withFeatured?: boolean) =>
  parseArtworkForm(readArtworkForm(form(overrides, withFeatured)));

/**
 * Разбор, который обязан пройти: падает с перечнем ошибок, если не прошёл.
 *
 * Нужен, чтобы обращаться к `data` без проверки на каждой строке — иначе
 * TypeScript не сужает тип результата, и тест обрастает `if (!ok) return`.
 */
function parsed(overrides?: Record<string, string>, withFeatured?: boolean): ArtworkInput {
  const result = parse(overrides, withFeatured);

  if (!result.ok) {
    throw new Error("Ожидался успешный разбор, а вышли ошибки: " + JSON.stringify(result.errors));
  }

  return result.data;
}

describe("необязательные поля", () => {
  it("превращает пустую строку в null, а не в пустую строку", () => {
    // Главное правило раздела о данных: неизвестное поле остаётся пустым.
    // Пустая строка в базе означала бы «техника: ничего», прошла бы все
    // проверки на заполненность, и подпись под работой показала бы
    // висящий разделитель.
    const data = parsed();

    expect(data.description).toBeNull();
    expect(data.category).toBeNull();
    expect(data.technique).toBeNull();
    expect(data.dimensions).toBeNull();
    expect(data.year).toBeNull();
    expect(data.price).toBeNull();
  });

  it("обрезает пробелы по краям", () => {
    // Иначе «Горы» и «Горы » станут двумя разными категориями
    // в фильтре галереи, и одна из них на вид будет пустой.
    expect(parsed({ category: "  Горы  " }).category).toBe("Горы");
  });

  it("поле из одних пробелов — тоже пусто", () => {
    expect(parsed({ technique: "   " }).technique).toBeNull();
  });
});

describe("название", () => {
  it("обязательно", () => {
    const result = parse({ title: "" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.title).toContain("обязательно");
  });

  it("не проходит из одних пробелов", () => {
    expect(parse({ title: "   " }).ok).toBe(false);
  });
});

describe("категория", () => {
  it("принимает значение из списка", () => {
    expect(parsed({ category: "Река и мост" }).category).toBe("Река и мост");
  });

  it("отвергает значение мимо списка", () => {
    // Селект не даёт выбрать чужое, но запрос можно отправить и в обход
    // формы. И старые значения вроде «Горный пейзаж» сохраниться заново
    // не должны — иначе фильтр галереи снова расползётся.
    for (const bad of ["Горный пейзаж", "Арх", "горы"]) {
      const result = parse({ category: bad });
      expect(result.ok, bad).toBe(false);
      if (result.ok) continue;
      expect(result.errors.category).toBeTruthy();
    }
  });
});

describe("размер", () => {
  it("сохраняет стандартный размер как есть", () => {
    expect(parsed({ dimensions: "40 × 50 см" }).dimensions).toBe("40 × 50 см");
  });

  it("берёт текст «другого размера», только когда он выбран", () => {
    expect(parsed({ dimensions: customSize, dimensionsCustom: " 35 × 45 см " }).dimensions).toBe(
      "35 × 45 см",
    );
    // Поле «Другой размер» есть в форме всегда, просто спрятано. Текст,
    // оставшийся в нём, не должен перебить выбранный стандартный размер.
    expect(parsed({ dimensions: "40 × 50 см", dimensionsCustom: "35 × 45 см" }).dimensions).toBe(
      "40 × 50 см",
    );
    expect(parsed({ dimensionsCustom: "35 × 45 см" }).dimensions).toBeNull();
  });

  it("не пропускает пустой «другой размер» и размер мимо списка", () => {
    const cases: Record<string, string>[] = [
      { dimensions: customSize, dimensionsCustom: "  " },
      { dimensions: "33 × 33 см" },
    ];

    for (const overrides of cases) {
      const result = parse(overrides);
      expect(result.ok, JSON.stringify(overrides)).toBe(false);
      if (result.ok) continue;
      expect(result.errors.dimensions).toBeTruthy();
    }
  });

  it("раскладывает размер из базы обратно на поля формы", () => {
    expect(dimensionsFields(null)).toEqual({ dimensions: "", dimensionsCustom: "" });
    expect(dimensionsFields("60 × 80 см")).toEqual({
      dimensions: "60 × 80 см",
      dimensionsCustom: "",
    });
    // Нестандартный размер не теряется: он уходит в «Другой размер».
    expect(dimensionsFields("35 × 45 см")).toEqual({
      dimensions: customSize,
      dimensionsCustom: "35 × 45 см",
    });
  });
});

describe("цена", () => {
  it("сохраняет ноль, а не считает его пустым полем", () => {
    // Ловушка, на которой уже спотыкались в formatPrice: `if (price)`
    // прячет цену 0, и «0 ₽» превращается в «цена не указана».
    expect(parsed({ price: "0" }).price).toBe(0);
  });

  it("не принимает мусор, который Number() превратил бы в число", () => {
    // Number("12e3") === 12000, Number("0x10") === 16 — оба уехали бы
    // в базу правдоподобным числом вместо отказа.
    for (const bad of ["12e3", "0x10", "45 000", "-500", "1.5", "сорок"]) {
      expect(parse({ price: bad }).ok, bad).toBe(false);
    }
  });

  it("отвергает лишний ноль в цене", () => {
    expect(parse({ price: "100000001" }).ok).toBe(false);
  });
});

describe("год", () => {
  it("принимает разумный", () => {
    expect(parsed({ year: "2024" }).year).toBe(2024);
  });

  it("отвергает опечатку, год раньше списка и год из будущего", () => {
    expect(parse({ year: "20025" }).ok).toBe(false);
    expect(parse({ year: String(firstYear - 1) }).ok).toBe(false);
    expect(parse({ year: String(new Date().getFullYear() + 1) }).ok).toBe(false);
  });
});

describe("статус и флаг главной", () => {
  it("отвергает неизвестный статус", () => {
    expect(parse({ status: "DELETED" }).ok).toBe(false);
    expect(parse({ status: "" }).ok).toBe(false);
  });

  it("отсутствие флажка означает «нет»", () => {
    // Невыбранный флажок браузер не присылает вовсе — отдельного значения
    // для «нет» не существует, и его отсутствие обязано читаться как false.
    expect(parsed().featured).toBe(false);
    expect(parsed({}, true).featured).toBe(true);
  });

  it("перечисляет все статусы из схемы базы", () => {
    // `satisfies` проверяет, что каждое значение в списке существует,
    // но не то, что перечислены все. Добавят в схему четвёртый статус —
    // упадёт здесь, а не тихо исчезнет из селекта админки.
    expect([...artworkStatuses].sort()).toEqual(Object.values(ArtworkStatus).sort());
  });
});

describe("ошибки", () => {
  it("собирает по одной ошибке на поле", () => {
    const result = parse({ title: "", year: "нет", price: "-1" });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(Object.keys(result.errors).sort()).toEqual(["price", "title", "year"]);
    for (const message of Object.values(result.errors)) {
      expect(message).toBeTruthy();
    }
  });
});
