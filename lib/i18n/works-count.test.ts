import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n";

describe("worksCount — «203 работы маслом» над лентами «О художнице»", () => {
  it("по-русски слово склоняется по числу", () => {
    const count = getDictionary("ru").about.worksCount;
    expect(count(1)).toBe("1 работа маслом");
    expect(count(2)).toBe("2 работы маслом");
    expect(count(5)).toBe("5 работ маслом");
    expect(count(11)).toBe("11 работ маслом");
    expect(count(21)).toBe("21 работа маслом");
    expect(count(203)).toBe("203 работы маслом");
    expect(count(211)).toBe("211 работ маслом");
  });

  it("по-английски — единственное и множественное", () => {
    const count = getDictionary("en").about.worksCount;
    expect(count(1)).toBe("1 oil painting");
    expect(count(203)).toBe("203 oil paintings");
  });
});
