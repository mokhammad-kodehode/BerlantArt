import { describe, expect, it } from "vitest";

import { clampView, fitView, maxZoom, zoomOf, zoomView } from "@/lib/wall-zoom";

// Фото телефона стоя в окне телефона: по ширине — в край, сверху и снизу поля.
const photo = { width: 1500, height: 2000 };
const box = { width: 390, height: 640 };
const fit = fitView(photo, box);

/** Где на экране окажется точка фото при этом виде. */
const onScreen = (view: { scale: number; x: number; y: number }, p: { x: number; y: number }) => ({
  x: view.x + p.x * view.scale,
  y: view.y + p.y * view.scale,
});

describe("fitView", () => {
  it("вписывает фото целиком и ставит по центру", () => {
    expect(fit.scale).toBeCloseTo(0.26);
    expect(fit.x).toBeCloseTo(0);
    expect(fit.y).toBeCloseTo((640 - 2000 * 0.26) / 2);
  });
});

describe("zoomView", () => {
  it("точка под пальцами остаётся под пальцами", () => {
    const at = { x: 200, y: 300 };
    const under = { x: (at.x - fit.x) / fit.scale, y: (at.y - fit.y) / fit.scale };
    const zoomed = zoomView(fit, { at, factor: 2.5 }, photo, box);
    expect(zoomOf(zoomed, photo, box)).toBeCloseTo(2.5);
    const moved = onScreen(zoomed, under);
    expect(moved.x).toBeCloseTo(at.x);
    expect(moved.y).toBeCloseTo(at.y);
  });

  it("сдвиг пальцами двигает фото вместе с ними", () => {
    const zoomed = zoomView(fit, { at: { x: 195, y: 320 }, factor: 3 }, photo, box);
    const panned = zoomView(
      zoomed,
      { at: { x: 195, y: 320 }, factor: 1, pan: { x: 30, y: -20 } },
      photo,
      box,
    );
    expect(panned.x - zoomed.x).toBeCloseTo(30);
    expect(panned.y - zoomed.y).toBeCloseTo(-20);
  });

  it("не мельче, чем целиком в окне, и не крупнее предела", () => {
    const smaller = zoomView(fit, { at: { x: 0, y: 0 }, factor: 0.3 }, photo, box);
    expect(smaller).toEqual(fit);
    const huge = zoomView(fit, { at: { x: 100, y: 100 }, factor: 50 }, photo, box);
    expect(zoomOf(huge, photo, box)).toBeCloseTo(maxZoom);
  });
});

describe("clampView", () => {
  it("увеличенное фото не открывает пустоту у краёв", () => {
    const scale = fit.scale * 3;
    const tooFarRight = clampView({ scale, x: 50, y: 50 }, photo, box);
    expect(tooFarRight.x).toBe(0);
    expect(tooFarRight.y).toBe(0);
    const tooFarLeft = clampView({ scale, x: -5000, y: -5000 }, photo, box);
    expect(tooFarLeft.x).toBeCloseTo(box.width - photo.width * scale);
    expect(tooFarLeft.y).toBeCloseTo(box.height - photo.height * scale);
  });

  it("по стороне, где фото меньше окна, держит его по центру", () => {
    const clamped = clampView({ scale: fit.scale, x: 0, y: 0 }, photo, box);
    expect(clamped.y).toBeCloseTo(fit.y);
  });
});
