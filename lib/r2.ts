import { AwsClient } from "aws4fetch";

import { clientEnv, r2Env } from "@/lib/env";

/**
 * Хранилище фотографий работ (Cloudflare R2).
 *
 * Модуль знает про хранилище и больше ни про что: страницы и компоненты
 * сюда не ходят — его зовёт Server Action админки (этап 6), уже после
 * проверки сессии.
 *
 * Файл летит в хранилище напрямую из браузера по разовой подписанной
 * ссылке, а не через наш сервер. Причина: у Vercel на тело запроса
 * к серверу лимит ~4.5 МБ, а фотография картины в требуемом качестве его
 * пробивает. Сервер только подписывает адрес — ключи в браузер не попадают.
 */

/** Что разрешено загружать: тип файла → расширение в ключе объекта. */
const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedType = keyof typeof allowedTypes;

/**
 * Потолок размера. 10 МБ — с запасом над требованием к фотографиям работ
 * (2000–2500px по длинной стороне, см. .ai/rules/images.md): такой снимок
 * в хорошем JPEG весит 2–4 МБ.
 */
const maxFileBytes = 10 * 1024 * 1024;

/**
 * Сколько живёт подписанная ссылка. Срок проверяется в момент начала
 * запроса, а не его завершения, поэтому пяти минут хватает и на медленный
 * канал: начатая вовремя заливка не оборвётся на середине.
 */
const uploadUrlTtlSeconds = 300;

/** Кириллица в ключе объекта превращает ссылку в процентную кашу. */
const translit: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function isAllowedType(contentType: string): contentType is AllowedType {
  return contentType in allowedTypes;
}

/**
 * Ключ объекта: `artworks/<uuid>-<имя-латиницей>.<расширение>`.
 *
 * Имя файла приходит из браузера, поэтому чистится по белому списку
 * `[a-z0-9-]`, а не вырезанием плохих символов: «../» в имени — классический
 * способ записать объект не туда, и чёрный список догоняет такие приёмы
 * всегда с опозданием. Расширение берётся из типа файла, а не из имени,
 * по той же причине.
 *
 * Uuid впереди, потому что два снимка с именем «IMG_0001.jpg» не должны
 * затирать друг друга.
 */
export function objectKey(fileName: string, contentType: AllowedType): string {
  const slug = [...fileName.replace(/\.[^.]*$/, "").toLowerCase()]
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

  const id = crypto.randomUUID();
  return `artworks/${slug ? `${id}-${slug}` : id}.${allowedTypes[contentType]}`;
}

export type UploadTarget = {
  /** Одноразовый адрес, по которому браузер кладёт файл методом PUT. */
  url: string;
  /** Ключ объекта — в базу сохраняется он, а не полный адрес. */
  key: string;
};

/**
 * Подписывает разовую ссылку на загрузку одного файла.
 *
 * Тип файла входит в подпись: браузер обязан прислать ровно тот
 * `Content-Type`, под который ссылка выдана, иначе хранилище откажет —
 * то есть ссылка не превращается в разрешение залить что угодно.
 *
 * С размером так не выходит: закрепить длину тела в подписи нельзя.
 * Поэтому `size` здесь — только заявленный вес, быстрый отказ до начала
 * заливки, а фактический вес сверяет Э6-2 перед тем, как завести запись
 * в базе. Проверке из браузера доверия нет.
 */
export async function createUploadUrl({
  fileName,
  contentType,
  size,
}: {
  fileName: string;
  contentType: string;
  size: number;
}): Promise<UploadTarget> {
  if (!isAllowedType(contentType)) {
    throw new Error(`Тип файла «${contentType}» не поддерживается. Нужен JPEG, PNG или WebP.`);
  }

  if (size > maxFileBytes) {
    throw new Error(
      `Файл весит ${(size / 1024 / 1024).toFixed(1)} МБ — больше ${maxFileBytes / 1024 / 1024} МБ загружать нельзя.`,
    );
  }

  const env = r2Env();
  const key = objectKey(fileName, contentType);

  const url = new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`,
  );
  url.searchParams.set("X-Amz-Expires", String(uploadUrlTtlSeconds));

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    // allHeaders обязателен. Без него aws4fetch подписывает только host,
    // Content-Type в подпись не попадает — проверено живьём: ссылка,
    // выданная под JPEG, спокойно принимала файл с типом application/zip.
    { aws: { signQuery: true, allHeaders: true } },
  );

  return { url: signed.url, key };
}

/**
 * Публичный адрес картинки по её ключу.
 *
 * `undefined`, если домен бакета не задан: это нормальное состояние, пока
 * хранилище не подключено, и страница в таком случае рисует заглушку,
 * а не падает целиком.
 */
export function publicUrl(key: string): string | undefined {
  const base = clientEnv.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return undefined;

  return `${base.replace(/\/+$/, "")}/${key}`;
}
