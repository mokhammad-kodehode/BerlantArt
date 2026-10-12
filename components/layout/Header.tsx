import { HeaderBar } from "@/components/layout/HeaderBar";
import { contactLinks } from "@/lib/contacts";

/**
 * Шапка сайта. Серверная обёртка над HeaderBar — ради одного: собрать
 * способы связи для меню бургера.
 *
 * Список контактов строит lib/contacts.ts из переменных окружения, а тот
 * при импорте проверяет и серверные переменные — в браузере их нет, и
 * клиентская шапка упала бы. Поэтому список собирается здесь, на сервере,
 * и уходит в HeaderBar готовыми данными, без подписей: подписи HeaderBar
 * берёт из своего словаря на языке страницы.
 */
export function Header({ variant }: { variant?: "solid" | "stage" }) {
  return <HeaderBar variant={variant} contacts={contactLinks()} />;
}
