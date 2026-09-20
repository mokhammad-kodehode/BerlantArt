"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { saveArtwork, type ArtworkFormState } from "@/lib/actions/artworks";
import {
  artworkCategories,
  artworkSizes,
  artworkStatusNames,
  artworkStatuses,
  artworkYears,
  customSize,
  isListed,
  newArtworkValues,
  type ArtworkFormRaw,
} from "@/lib/artwork-form";

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
 * а рассинхронизация с сервером и есть источник таких ошибок. По той же
 * причине поле «Другой размер» показывает CSS, а не состояние компонента.
 */

/**
 * Пункт для значения, которого нет в списке, — например, старой категории.
 *
 * Без него селект молча показал бы первый пункт, и одно нажатие
 * «Сохранить» переписало бы категорию работы, хотя её никто не трогал.
 * С ним видно, что стоит сейчас, а сервер не даст сохранить значение
 * мимо списка и попросит выбрать.
 */
function unlistedOption(list: readonly string[], value: string) {
  if (value === "" || isListed(list, value)) return null;

  return <option value={value}>{value} — нет в списке, выберите другое</option>;
}

/** Значения для заполнения формы. `null` — создание новой работы. */
export type ArtworkFormInitial = {
  id: string;
  values: ArtworkFormRaw;
} | null;

export function ArtworkForm({
  initial,
  photos,
}: {
  initial: ArtworkFormInitial;
  /**
   * Блок фотографий. Стоит внутри формы, между полями и кнопкой
   * «Сохранить», по просьбе заказчика: фотография — часть работы,
   * и искать её ниже кнопки сохранения неестественно.
   *
   * Отправке формы блок не мешает: все его кнопки объявлены type="button",
   * а поля не имеют name и в данные формы не попадают. Свои изменения
   * он сохраняет сам, отдельными действиями.
   */
  photos?: ReactNode;
}) {
  const [state, formAction, isPending] = useActionState<ArtworkFormState, FormData>(
    saveArtwork,
    {},
  );

  const values = state.values ?? initial?.values ?? newArtworkValues();
  const years = artworkYears().map(String);
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
    defaultValue: typeof values[name] === "string" ? values[name] : "",
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
          {/* key стоит до spread намеренно: после него JSX собирается через
              createElement, и React 19 требует key у каждого <option>,
              переданного рядом со списком. */}
          <select
            key={`category-${values.category}`}
            {...fieldProps("category")}
            defaultValue={values.category}
          >
            <option value="">Не выбрана</option>
            {unlistedOption(artworkCategories, values.category)}
            {artworkCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {fieldError("category")}
        </div>

        <div className="field">
          <label htmlFor="technique">Техника</label>
          <input {...field("technique")} type="text" autoComplete="off" />
          {fieldError("technique")}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {/* Поле «Другой размер» появляется, только когда он выбран, — через
            :has() на обёртке. Значение `other` в классе — это `customSize`
            из lib/artwork-form.ts: Tailwind собирает классы по тексту
            исходников, подставить константу в имя класса нельзя. */}
        <div className="field group">
          <label htmlFor="dimensions">Размер</label>
          <select
            key={`dimensions-${values.dimensions}`}
            {...fieldProps("dimensions")}
            defaultValue={values.dimensions}
          >
            <option value="">Не указан</option>
            {artworkSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value={customSize}>Другой размер</option>
          </select>
          <input
            {...field("dimensionsCustom")}
            type="text"
            autoComplete="off"
            aria-label="Другой размер"
            placeholder="Например: 35 × 45 см"
            className="input mt-2 hidden group-has-[option[value=other]:checked]:block"
          />
          {fieldError("dimensions")}
        </div>

        <div className="field">
          <label htmlFor="year">Год</label>
          <select key={`year-${values.year}`} {...fieldProps("year")} defaultValue={values.year}>
            <option value="">Не указан</option>
            {unlistedOption(years, values.year)}
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {fieldError("year")}
        </div>

        <div className="field">
          <label htmlFor="price">Цена, ₽</label>
          <input {...field("price")} type="text" inputMode="numeric" autoComplete="off" />
          {fieldError("price")}
        </div>
      </div>

      {photos}

      <div className="grid items-start gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="status">Статус</label>
          <select
            {...fieldProps("status")}
            key={`status-${values.status}`}
            defaultValue={values.status}
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
            key={`featured-${values.featured}`}
            defaultChecked={values.featured}
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
