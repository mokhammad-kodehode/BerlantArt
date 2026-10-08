import { describe, expect, it } from "vitest";

import { purchaseAction } from "@/lib/purchase";

const base = {
  title: "Шёпот арок",
  price: "5 000 ₽",
  status: "AVAILABLE" as const,
  pageUrl: "https://example.test/gallery/1",
};

describe("purchaseAction", () => {
  it("предлагает купить по указанной цене", () => {
    const action = purchaseAction(base);
    expect(action.label).toBe("Купить");
    // Цена и ссылка в сообщении — художнице не нужно переспрашивать, о чём речь.
    expect(action.message).toContain("за 5 000 ₽");
    expect(action.message).toContain(base.pageUrl);
  });

  it("без цены — спрашивает цену, а не предлагает купить", () => {
    const action = purchaseAction({ ...base, price: null });
    expect(action.label).toBe("Узнать цену");
    expect(action.message).not.toContain("купить");
  });

  it("у забронированной не предлагает купить", () => {
    expect(purchaseAction({ ...base, status: "RESERVED" }).label).toBe("Спросить о картине");
  });

  it("в английской версии пишет по-английски", () => {
    const action = purchaseAction({ ...base, price: "₽5,000", lang: "en" });
    expect(action.label).toBe("Buy");
    expect(action.message).toContain("I would like to buy");
    expect(action.message).toContain("₽5,000");
  });

  it("у проданной не предлагает купить, даже если цена осталась", () => {
    const action = purchaseAction({ ...base, status: "SOLD" });
    expect(action.label).not.toBe("Купить");
    expect(action.message).not.toContain("₽");
  });
});
