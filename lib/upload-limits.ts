/**
 * Что разрешено загружать.
 *
 * Отдельный модуль без единого серверного импорта — намеренно. Эти же
 * значения нужны клиентскому загрузчику для быстрого отказа до заливки,
 * а `lib/r2.ts` читает ключи от хранилища: импортируй клиент его — и
 * серверный код поехал бы в браузер.
 *
 * Второй довод важнее первого: одно определение на обе стороны. Две копии
 * ограничений расходятся при первой же правке, и браузер начинает
 * пропускать то, что сервер отвергнет, — человек видит заливку, которая
 * дошла до конца и всё равно не сработала.
 */

/** Тип файла → расширение в ключе объекта. */
export const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedType = keyof typeof allowedTypes;

/** Для атрибута `accept` у поля выбора файла: он отсеивает лишнее
 * прямо в системном окне, до всякой проверки. */
export const acceptAttribute = Object.keys(allowedTypes).join(",");

/**
 * Потолок размера. 10 МБ — с запасом над требованием к фотографиям работ
 * (2000–2500px по длинной стороне, см. .ai/rules/images.md): такой снимок
 * в хорошем JPEG весит 2–4 МБ.
 */
export const maxFileBytes = 10 * 1024 * 1024;

export function isAllowedType(contentType: string): contentType is AllowedType {
  return contentType in allowedTypes;
}

/** «3.7 МБ» — для сообщений человеку. Целые мегабайты врали бы про
 * файл в 10.4 МБ, показывая его как ровно 10. */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

/**
 * Проверка файла до обращения к сети. Возвращает текст отказа или `null`.
 *
 * Один и тот же текст показывается в браузере и приходит с сервера:
 * человеку незачем знать, какая из двух проверок сработала.
 */
export function checkUpload(file: { type: string; size: number }): string | null {
  if (!isAllowedType(file.type)) {
    return `Тип файла «${file.type || "неизвестен"}» не поддерживается. Нужен JPEG, PNG или WebP.`;
  }

  if (file.size > maxFileBytes) {
    return `Файл весит ${formatBytes(file.size)} — больше ${formatBytes(maxFileBytes)} загружать нельзя.`;
  }

  return null;
}

/**
 * Ключ объекта, который мы выдаём сами: `artworks/<uuid>-<имя>.<расширение>`
 * либо `artworks/<uuid>.<расширение>`, если от имени после очистки ничего
 * не осталось.
 *
 * Проверяется на сервере перед тем, как поверить пришедшему из браузера
 * ключу: браузер может прислать любой, в том числе с попыткой уйти вверх
 * по дереву или указать на чужой объект.
 */
const keyPattern = /^artworks\/[0-9a-f-]{36}(-[a-z0-9-]{1,40})?\.(jpg|png|webp)$/;

export function isOwnObjectKey(key: string): boolean {
  return keyPattern.test(key);
}
