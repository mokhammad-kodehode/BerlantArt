import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Адрес сайта для поисковиков: карта сайта, канонические ссылки, превью.
 *
 * На боевом сайте с адресом по умолчанию (localhost) лучше упасть, чем
 * собраться: карта сайта и канонические ссылки отправили бы Google
 * и Яндекс на localhost, и сайт выпал бы из поиска молча. Ошибка
 * говорит, что сделать.
 */
export function siteUrl(): string {
  const url = clientEnv.NEXT_PUBLIC_SITE_URL;

  if (serverEnv.VERCEL_ENV === "production" && new URL(url).hostname === "localhost") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL на боевом сайте не задан: поисковики получили бы адрес localhost. " +
        "Впиши в Vercel → Settings → Environment Variables главный адрес сайта, " +
        "например https://www.berlant-art.com, и пересобери.",
    );
  }

  return url;
}
