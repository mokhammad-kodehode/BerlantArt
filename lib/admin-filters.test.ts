import { describe, expect, it } from "vitest";

import { adminArtworksHref, parseAdminFilters } from "@/lib/admin-filters";

/**
 * Параметры адреса — чужой ввод: адрес правят руками, он приходит
 * по чужим ссылкам и склеивается копированием. Ошибка здесь не видна
 * глазами: страница либо упадёт, либо молча покажет не ту выборку.
 */

describe("разбор адреса", () => {
  it("читает поиск и статус", () => {
    expect(parseAdminFilters({ q: "башни", status: "SOLD" })).toEqual({
      search: "башни",
      status: "SOLD",
    });
  });

  it("пустой адрес означает «без фильтра»", () => {
    expect(parseAdminFilters({})).toEqual({ search: undefined, status: undefined });
  });

  it("не роняет страницу на мусоре, а откатывает к «без фильтра»", () => {
    // Неизвестный статус уронил бы сам запрос к базе ошибкой типа —
    // это не гипотетический случай, а опечатка в адресе.
    expect(parseAdminFilters({ status: "DELETED" }).status).toBeUndefined();
    expect(parseAdminFilters({ status: "" }).status).toBeUndefined();
    expect(parseAdminFilters({ q: "   " }).search).toBeUndefined();
    expect(parseAdminFilters({ q: "x".repeat(500) }).search).toBeUndefined();
  });

  it("берёт первое значение повторённого параметра", () => {
    // ?status=SOLD&status=AVAILABLE получается при склейке ссылок.
    // Гадать, какое верное, незачем — показываем хоть что-то.
    expect(parseAdminFilters({ status: ["SOLD", "AVAILABLE"] }).status).toBe("SOLD");
  });

  it("обрезает пробелы вокруг запроса", () => {
    expect(parseAdminFilters({ q: "  башни  " }).search).toBe("башни");
  });
});

describe("сборка адреса", () => {
  it("без фильтров даёт чистый адрес", () => {
    // Не «/admin/artworks?», не «?status=» — пустой параметр в адресе
    // выглядит как поломка.
    expect(adminArtworksHref({})).toBe("/admin/artworks");
    expect(adminArtworksHref({ status: "SOLD" }, { status: undefined })).toBe("/admin/artworks");
  });

  it("сохраняет нетронутый фильтр при смене другого", () => {
    // Клик по статусу не должен стирать набранный поиск, иначе человек
    // всякий раз ищет заново.
    expect(adminArtworksHref({ search: "башни" }, { status: "SOLD" })).toBe(
      "/admin/artworks?q=%D0%B1%D0%B0%D1%88%D0%BD%D0%B8&status=SOLD",
    );
  });

  it("собранный адрес читается обратно тем же разбором", () => {
    // Круговая проверка: сборка и разбор обязаны сходиться, иначе
    // переключатель фильтра будет вести на выборку, которую сам же
    // не сможет прочитать.
    const filters = { search: "Башни в тумане", status: "RESERVED" } as const;
    const href = adminArtworksHref(filters);
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);

    expect(parseAdminFilters(params)).toEqual(filters);
  });
});
