import type { Metadata } from "next";

import { HomePage } from "@/components/pages/HomePage";
import { pageAlternates } from "@/lib/page-metadata";

/** Заголовок и описание — из корневого layout; здесь только адреса. */
export const metadata: Metadata = {
  alternates: pageAlternates("en", "/"),
};

/**
 * Как часто страница перерисовывается заново, в секундах.
 *
 * Без этой строки главная стала бы динамической — запрос в базу на каждое
 * открытие. С ней она снова готовится заранее: посетитель получает готовый
 * HTML, а уснувшая база (бесплатный тариф Supabase засыпает через неделю
 * простоя) не роняет главную — отдаётся последняя удачная версия.
 *
 * Значение обязано быть числом-литералом: Next читает его при сборке,
 * и выражение вроде 60 * 5 он не разберёт.
 *
 * Плата — правка через админку появится с задержкой до пяти минут. На этапе 6
 * админка вызовет revalidatePath("/"), и задержка исчезнет.
 */
export const revalidate = 300;

export default function Page() {
  return <HomePage lang="en" />;
}
