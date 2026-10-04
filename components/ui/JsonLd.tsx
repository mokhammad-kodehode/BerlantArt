import { serializeJsonLd, type JsonLd as JsonLdData } from "@/lib/seo";

/**
 * Структурированные данные для поисковиков — скрытое описание страницы
 * на языке schema.org: «это художница», «это картина за 5 000 ₽, в наличии».
 * Посетитель его не видит, Google и Яндекс берут из него расширенную выдачу.
 */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      // Строка экранирована в serializeJsonLd: `<` заменён, `</script>`
      // из названия работы не закроет тег.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
