import { describe, expect, it, vi } from "vitest";

import { positionOf } from "@/lib/artwork-thumbs";
import { ringNeighbours } from "@/lib/artworks";

// lib/artworks.ts тянет клиент базы; самой базы в тестах нет, и ни
// один из проверяемых здесь вызовов в неё не ходит.
vi.mock("@/lib/db", () => ({ db: {} }));

const works = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (pair: { prev: { id: string } | null; next: { id: string } | null }) => [
  pair.prev?.id ?? null,
  pair.next?.id ?? null,
];

describe("ringNeighbours", () => {
  it("в середине — соседние по списку", () => {
    expect(ids(ringNeighbours(works("a", "b", "c", "d"), "b"))).toEqual(["a", "c"]);
  });

  it("кольцо замкнуто: у первой слева — последняя, у последней справа — первая", () => {
    const list = works("a", "b", "c");
    expect(ids(ringNeighbours(list, "a"))).toEqual(["c", "b"]);
    expect(ids(ringNeighbours(list, "c"))).toEqual(["b", "a"]);
  });

  it("две работы — сосед один и тот же с обеих сторон", () => {
    expect(ids(ringNeighbours(works("a", "b"), "a"))).toEqual(["b", "b"]);
  });

  it("одна работа или работы нет в списке — стрелок нет", () => {
    expect(ids(ringNeighbours(works("a"), "a"))).toEqual([null, null]);
    expect(ids(ringNeighbours(works("a", "b"), "x"))).toEqual([null, null]);
  });
});

/**
 * На этом держится О-5: экшены обновляют страницы только самой работы
 * и двух её соседей. Тест сверяет, что у всех остальных работ соседи
 * правда не поменялись — иначе стрелка на их странице вела бы не туда
 * до следующей правки.
 */
describe("что меняется у соседей при добавлении и удалении", () => {
  const before = works("a", "b", "c", "d", "e");
  const neighbourIds = (list: { id: string }[]) =>
    new Map(list.map((work) => [work.id, ids(ringNeighbours(list, work.id))]));

  it("новая работа встаёт первой — меняются только её соседи", () => {
    const after = [{ id: "new" }, ...before];
    const { prev, next } = ringNeighbours(after, "new");
    const touched = new Set(["new", prev?.id, next?.id]);

    const was = neighbourIds(before);
    const now = neighbourIds(after);
    for (const work of before) {
      if (touched.has(work.id)) continue;
      expect(now.get(work.id), work.id).toEqual(was.get(work.id));
    }
    expect([prev?.id, next?.id]).toEqual(["e", "a"]);
  });

  it("удалили работу — меняются только её бывшие соседи", () => {
    for (const removed of ["a", "c", "e"]) {
      const { prev, next } = ringNeighbours(before, removed);
      const after = before.filter((work) => work.id !== removed);
      const touched = new Set([removed, prev?.id, next?.id]);

      const was = neighbourIds(before);
      const now = neighbourIds(after);
      for (const work of after) {
        if (touched.has(work.id)) continue;
        expect(now.get(work.id), `${removed} → ${work.id}`).toEqual(was.get(work.id));
      }
    }
  });
});

describe("positionOf", () => {
  it("номер с единицы и общее число", () => {
    expect(positionOf(works("a", "b", "c"), "b")).toEqual({ position: 2, total: 3 });
  });

  it("работы нет в списке — номера нет", () => {
    expect(positionOf(works("a"), "x")).toBeNull();
  });
});
