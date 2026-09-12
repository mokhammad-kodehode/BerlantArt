"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { saveArtwork, type ArtworkFormState } from "@/lib/actions/artworks";
import { artworkStatusNames, artworkStatuses, type ArtworkFormRaw } from "@/lib/artwork-form";

/**
 * Форма работы: одна на создание и на редактирование.
 *
 * Клиентская из-за `useActionState` — без него ошибки в полях появлялись бы
 * только после полной перезагрузки страницы.
 *
 * Значения полей берутся из `state.values`, если форму уже отправляли,
 * и из `initial` в первый раз. Порядок именно такой: React 19 после Server
 * Action очищает форму целиком, и без возврата значений одна опечатка
 * в годе стирала бы все девять полей. Поймано в Э6-1 на форме входа,
 * где полей было два и терялось меньше.
 *
 * У селекта и флажка есть `key`, зависящий от значения, — и это не
 * украшение. Поймано живьём: `defaultValue` у `<select>` и
 * `defaultChecked` у флажка действуют только при первом появлении
 * элемента. После сохранения React сбрасывал форму, и селект возвращался
 * к статусу, который был при открытии страницы: в базе лежало «Продана»,
 * а форма показывала «Доступна». Смена `key` пересоздаёт элемент, и он
 * подхватывает новое значение.
 *
 * Управляемыми (`value` + `onChange`) их делать не стали: это то же
 * лечение ценой состояния, которое пришлось бы синхронизировать руками, —
 * а рассинхронизация с сервером и есть источник таких ошибок.
 */

/** Значения для заполнения формы. `null` — создание новой работы. */
export type ArtworkFormInitial = {
  id: string;
  values: ArtworkFormRaw;
} | null;

export function ArtworkForm({ initial }: { initial: ArtworkFormInitial }) {
  const [state, formAction, isPending] = useActionState<ArtworkFormState, FormData>(
    saveArtwork,
    {},
  );

  const values = state.values ?? initial?.values;
  const errors = state.errors ?? {};

  /** Свойства поля без значения: разметка ошибки и оформление.
   * `aria-invalid` и `aria-describedby` нужны, чтобы скринридер прочитал
   * причину отказа, а не просто «поле». */
  const fieldProps = (name: keyof ArtworkFormRaw) => ({
    id: name,
    name,
    "aria-invalid": errors[name] !== undefined,
    "aria-describedby": errors[name] !== undefined ? `${name}-error` : undefined,
    className: "input",
  });

  /** То же плюс значение — для неуправляемых текстовых полей. */
  const field = (name: keyof ArtworkFormRaw) => ({
    ...fieldProps(name),
    defaultValue: typeof values?.[name] === "string" ? values[name] : "",
  });

  const fieldError = (name: keyof ArtworkFormRaw) =>
    errors[name] === undefined ? null : (
      <p id={`${name}-error`} role="alert" className="field-error">
        {errors[name]}
      </p>
    );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {initial !== null && <input type="hidden" name="id" value={initial.id} />}

      <div className="field">
        <label htmlFor="title">Название</label>
        <input {...field("title")} type="text" required autoComplete="off" />
        {fieldError("title")}
      </div>

      <div className="field">
        <label htmlFor="description">Описание</label>
        <textarea {...field("description")} rows={4} />
        {fieldError("description")}
      </div>

      {/* Два поля в строку на широком экране: категория и техника короткие,
          в один столбец форма растягивалась бы на два экрана прокрутки. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="category">Категория</label>
          <input {...field("category")} type="text" autoComplete="off" />
          <p className="field-hint">Например: пейзаж. По ней работает фильтр в галерее.</p>
          {fieldError("category")}
        </div>

        <div className="field">
          <label htmlFor="technique">Техника</label>
          <input {...field("technique")} type="text" autoComplete="off" />
          <p className="field-hint">Например: холст, масло.</p>
          {fieldError("technique")}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="dimensions">Размеры</label>
          <input {...field("dimensions")} type="text" autoComplete="off" placeholder="60 × 80 см" />
          {fieldError("dimensions")}
        </div>

        <div className="field">
          <label htmlFor="year">Год</label>
          {/* inputMode="numeric" поднимает на телефоне цифровую клавиатуру,
              а type="text" оставлен намеренно: type="number" в Safari
              позволяет ввести «12e3» и молча отдаёт пустое значение. */}
          <input {...field("year")} type="text" inputMode="numeric" autoComplete="off" />
          {fieldError("year")}
        </div>

        <div className="field">
          <label htmlFor="price">Цена, ₽</label>
          <input {...field("price")} type="text" inputMode="numeric" autoComplete="off" />
          <p className="field-hint">Пусто — цена не показывается.</p>
          {fieldError("price")}
        </div>
      </div>

      <div className="grid items-start gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="status">Статус</label>
          <select
            {...fieldProps("status")}
            key={`status-${values?.status ?? "AVAILABLE"}`}
            defaultValue={values?.status ?? "AVAILABLE"}
          >
            {artworkStatuses.map((value) => (
              <option key={value} value={value}>
                {artworkStatusNames[value]}
              </option>
            ))}
          </select>
          {fieldError("status")}
        </div>

        <label className="flex cursor-pointer items-center gap-3 pt-5 text-sm">
          <input
            type="checkbox"
            name="featured"
            key={`featured-${values?.featured ?? false}`}
            defaultChecked={values?.featured ?? false}
            className="accent-accent size-4"
          />
          Показывать на главной
        </label>
      </div>

      {state.error !== undefined && (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Сохраняем…" : initial === null ? "Создать работу" : "Сохранить"}
        </Button>

        {/* Сообщение об успехе живёт в потоке документа, а не всплывашкой:
            всплывашка исчезает раньше, чем её заметят. */}
        {state.saved === true && !isPending && (
          <p role="status" className="text-accent-2-700 text-sm">
            Сохранено. Изменения уже видны на сайте.
          </p>
        )}
      </div>
    </form>
  );
}
