import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Button, ButtonLink } from "@/components/ui/Button";
import { adminArtworksHref, parseAdminFilters } from "@/lib/admin-filters";
import { artworkStatusNames, artworkStatuses } from "@/lib/artwork-form";
import { formatPrice, getArtworksForAdmin, primaryImageUrl } from "@/lib/artworks";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Работы",
  robots: { index: false, follow: false },
};

/**
 * Рабочий список всех работ.
 *
 * Здесь видно всё, включая проданные: это не витрина, а инструмент —
 * прятать из него что-либо значило бы делать часть коллекции
 * недоступной для правки.
 *
 * Поиск и фильтр живут в адресе страницы, а не в состоянии браузера:
 * ссылку на «всё проданное» можно оставить в закладках, и она откроется
 * той же выборкой. Тем же приёмом сделаны фильтры публичной галереи.
 *
 * Один запрос в базу на страницу, и он не растёт вместе с числом работ.
 * Постраничного вывода нет намеренно: при пяти работах он мешает,
 * задуматься стоит после полусотни.
 */
export default async function AdminArtworksPage({ searchParams }: PageProps<"/admin/artworks">) {
  await requireAdmin();

  const filters = parseAdminFilters(await searchParams);
  const works = await getArtworksForAdmin(filters);

  const hasFilters = filters.search !== undefined || filters.status !== undefined;

  return (
    <AdminShell
      title="Работы"
      back={{ href: "/admin", label: "В панель управления" }}
      actions={
        <ButtonLink href="/admin/artworks/new" variant="primary">
          Добавить работу
        </ButtonLink>
      }
    >
      {/* Обычная форма с method="get": отправляет её сам браузер, набранное
          оказывается в адресе, и всё работает без JavaScript. */}
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="field min-w-[220px] flex-1">
          <label htmlFor="q">Поиск по названию</label>
          <input
            id="q"
            name="q"
            type="search"
            className="input"
            defaultValue={filters.search ?? ""}
            placeholder="башни"
          />
        </div>

        {/* Выбранный статус переносится в форму скрытым полем: иначе поиск
            сбрасывал бы фильтр, выбранный ссылкой рядом. */}
        {filters.status !== undefined && (
          <input type="hidden" name="status" value={filters.status} />
        )}

        <Button type="submit" variant="secondary">
          Найти
        </Button>

        {hasFilters && (
          <Link href="/admin/artworks" className="text-ink/75 hover:text-accent pb-2 text-sm">
            Сбросить
          </Link>
        )}
      </form>

      {/* Переключатели статуса — ссылки, а не кнопки: переход и есть
          применение фильтра, клиентского кода не нужно вовсе.

          Вид тот же, что у фильтров галереи: выбранный — заливкой, прочие —
          спокойной серой. Прежде это были метки-таблетки цветом акцента,
          и заказчик назвал их тусклыми: тонкая охристая обводка на светлом
          фоне читается слабо, а выбранный вариант почти не отличался
          от остальных. */}
      <nav aria-label="Фильтр по статусу" className="mb-6 flex flex-wrap gap-2">
        {[undefined, ...artworkStatuses].map((status) => {
          const active = filters.status === status;
          return (
            <ButtonLink
              key={status ?? "all"}
              href={adminArtworksHref(filters, { status })}
              aria-current={active ? "page" : undefined}
              variant={active ? "primary" : "soft"}
            >
              {status === undefined ? "Все" : artworkStatusNames[status]}
            </ButtonLink>
          );
        })}
      </nav>

      {works.length === 0 ? (
        <div className="panel-dashed p-8 text-center">
          {/* Два разных пустых состояния. «Ничего не нашлось» и «работ ещё
              нет» требуют разных действий, и одно сообщение на оба случая
              заставляло бы гадать, что произошло. */}
          {hasFilters ? (
            <>
              <p className="mb-2 font-medium">По этому запросу ничего не нашлось</p>
              <p className="text-ink/75 mb-5 text-sm">Попробуй другое слово или сбрось фильтры.</p>
              <ButtonLink href="/admin/artworks">Показать все работы</ButtonLink>
            </>
          ) : (
            <>
              <p className="mb-2 font-medium">Работ пока нет</p>
              <p className="text-ink/75 mb-5 text-sm">
                Добавь первую — она появится на сайте сразу после сохранения.
              </p>
              <ButtonLink href="/admin/artworks/new" variant="primary">
                Добавить работу
              </ButtonLink>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-ink/75 mb-3 text-sm">
            {works.length === 1 ? "1 работа" : `Работ: ${works.length}`}
          </p>

          <ul className="flex flex-col gap-3">
            {works.map((work) => {
              const src = primaryImageUrl(work);
              const price = formatPrice(work.price);

              return (
                <li
                  key={work.id}
                  className="border-divider flex flex-wrap items-center gap-3 rounded-[14px] border p-3"
                >
                  <Link
                    href={`/admin/artworks/${work.id}`}
                    className="bg-surface relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]"
                  >
                    {src === undefined ? (
                      <span className="text-ink/75 flex h-full items-center justify-center text-sm">
                        нет фото
                      </span>
                    ) : (
                      <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </Link>

                  <div className="min-w-[180px] flex-1">
                    <Link
                      href={`/admin/artworks/${work.id}`}
                      className="hover:text-accent font-medium"
                    >
                      {work.title}
                    </Link>
                    <p className="text-ink/75 text-sm">
                      {[work.category, price, `фото: ${work.images.length}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <StatusSelect artworkId={work.id} title={work.title} status={work.status} />

                    {/* «Редактировать» — значком, а не кнопкой со словом:
                      со словом она занимала на телефоне целую строку
                      и спорила по весу с «Добавить работу». Стоит в одном
                      ряду со статусом: в углу карточки он висел выше
                      селекта и выглядел сбитым.

                      Значок без подписи обязан иметь имя для скринридера
                      (aria-label) и всплывающую подсказку для мыши (title) —
                      иначе действие читается только зрячим и только
                      по догадке. Название работы в имени не случайно:
                      в списке таких кнопок шесть, и «Редактировать» подряд
                      шесть раз ничего не сказало бы. */}
                    <Link
                      href={`/admin/artworks/${work.id}`}
                      aria-label={`Редактировать работу «${work.title}»`}
                      title="Редактировать"
                      className="border-divider text-ink/75 hover:text-ink hover:bg-ink/5 flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11.2 2.3a1.6 1.6 0 0 1 2.3 2.3L5.6 12.4l-3 .7.7-3z" />
                      </svg>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AdminShell>
  );
}
