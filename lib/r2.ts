import { AwsClient } from "aws4fetch";

import { clientEnv, r2Env } from "@/lib/env";
import { allowedTypes, checkUpload, isAllowedType, type AllowedType } from "@/lib/upload-limits";

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

/**
 * Сколько живёт подписанная ссылка. Срок проверяется в момент начала
 * запроса, а не его завершения, поэтому пяти минут хватает и на медленный
 * канал: начатая вовремя заливка не оборвётся на середине.
 */
const uploadUrlTtlSeconds = 300;

/** Подписанный клиент к бакету. Собирается на каждый вызов: в нём нет
 * состояния, а хранить его в модуле значило бы держать ключи в памяти
 * дольше, чем нужно. */
function client(env: ReturnType<typeof r2Env>): AwsClient {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(env: ReturnType<typeof r2Env>, key: string): string {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`;
}

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
  // Та же проверка, что в браузере, и теми же словами: человеку незачем
  // знать, которая из двух сработала. Клиентской проверке при этом
  // не верим — она отсекает лишний поход к сети, а не защищает.
  const refusal = checkUpload({ type: contentType, size });
  if (refusal !== null) throw new Error(refusal);

  // Сюда не дойти: checkUpload уже отверг бы неразрешённый тип. Проверка
  // стоит ради сужения типа — без неё TypeScript не знает, что расширение
  // для contentType существует.
  if (!isAllowedType(contentType)) throw new Error("Недопустимый тип файла.");

  const env = r2Env();
  const key = objectKey(fileName, contentType);

  const url = new URL(objectUrl(env, key));
  url.searchParams.set("X-Amz-Expires", String(uploadUrlTtlSeconds));

  const signed = await client(env).sign(
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

/** Что хранилище знает об объекте. */
export type StoredObject = {
  /** Фактический вес в байтах — тот, что реально долетел. */
  size: number;
  /** Фактический тип, записанный при заливке. */
  contentType: string;
};

/**
 * Спрашивает у хранилища, что на самом деле лежит по ключу.
 * `null`, если объекта нет.
 *
 * Это и есть способ не верить браузеру. После заливки клиент сообщает
 * серверу ключ — но ключ приходит из браузера и сам по себе не доказывает
 * ничего: можно прислать ключ, по которому ничего не заливалось, или
 * указать на чужой объект. Размер закрепить подписью нельзя (см. выше),
 * поэтому единственная надёжная проверка — спросить само хранилище.
 */
export async function headObject(key: string): Promise<StoredObject | null> {
  const env = r2Env();
  const response = await client(env).fetch(objectUrl(env, key), { method: "HEAD" });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Хранилище ответило ${response.status} на запрос об объекте «${key}».`);
  }

  return {
    size: Number(response.headers.get("content-length") ?? 0),
    contentType: response.headers.get("content-type") ?? "",
  };
}

/**
 * Удаляет объект. Молчит, если его уже нет: удаление того, чего нет, —
 * не ошибка, а именно то состояние, которого мы добивались.
 *
 * Нужно в двух местах: убрать файл, не прошедший проверку после заливки,
 * и вычистить бакет при удалении работы (Э6-4). За хранение платят,
 * поэтому мусор в нём копиться не должен.
 */
export async function deleteObject(key: string): Promise<void> {
  const env = r2Env();
  const response = await client(env).fetch(objectUrl(env, key), { method: "DELETE" });

  // 204 — удалили, 404 — удалять было нечего. Оба исхода нас устраивают.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Не удалось удалить объект «${key}»: хранилище ответило ${response.status}.`);
  }
}
