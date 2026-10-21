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
 * Сутки, а не пять минут, как было: правку из админки страница и так
 * получает сразу (revalidatePath в lib/revalidate.ts), а лишняя пересборка
 * — запись в кеш Vercel, которых на бесплатном тарифе не бесконечно
 * (21.10.2026).
 */
export const revalidate = 86400;

export default function Page() {
  return <HomePage lang="en" />;
}
