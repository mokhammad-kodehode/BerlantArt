import { z } from "zod";

import { artworkStatuses } from "@/lib/artwork-form";
import type { AdminArtworkFilters } from "@/lib/artworks";

/**
 * Разбор параметров адреса для списка работ в админке.
 *
 * Вынесено из страницы отдельным модулем, чтобы покрыть тестом: это
 * чужой ввод, а адрес правится руками и приходит по чужим ссылкам.
 * Ошибка здесь не видна глазами — страница либо упадёт пятисотой,
 * либо молча покажет не то.
 *
 * Мусор откатывается к «без фильтра» через `.catch()`, а не роняет
 * страницу: опечатка в адресе — не повод показывать ошибку. Со статусом
 * это ещё и обязательно: значение вне трёх вариантов уронило бы сам
 * запрос к базе ошибкой типа.
 */
const schema = z.object({
  search: z.string().trim().min(1).max(200).optional().catch(undefined),
  status: z.enum(artworkStatuses).optional().catch(undefined),
});

/** Сырой параметр адреса: Next отдаёт массив, если параметр повторён. */
type RawParam = string | string[] | undefined;

/**
 * Повторённый параметр (`?status=SOLD&status=AVAILABLE`) — берём первый.
 *
 * Не роняем страницу и не гадаем, какой верен: такой адрес получается
 * при склейке ссылок, и разумнее показать хоть что-то.
 */
function first(value: RawParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminFilters(params: Record<string, RawParam>): AdminArtworkFilters {
  return schema.parse({ search: first(params.q), status: first(params.status) });
}

/**
 * Собирает адрес списка с текущими фильтрами и одной применённой правкой.
 *
 * Не тронутый параметр сохраняется: выбор статуса не должен стирать
 * набранный поиск, иначе человек всякий раз ищет заново. `undefined`
 * убирает параметр вовсе — «Все» выглядит как `/admin/artworks`,
 * а не как `/admin/artworks?status=`.
 */
export function adminArtworksHref(
  current: AdminArtworkFilters,
  override: Partial<AdminArtworkFilters> = {},
): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();

  if (merged.search) params.set("q", merged.search);
  if (merged.status) params.set("status", merged.status);

  const query = params.toString();
  return query ? `/admin/artworks?${query}` : "/admin/artworks";
}
