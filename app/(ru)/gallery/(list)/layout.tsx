import { Header } from "@/components/layout/Header";

/**
 * Обёртка списка работ: стена и шапка.
 *
 * Шапка живёт здесь, а не в page.tsx и loading.tsx по отдельности. Пока
 * данные грузятся, Next показывает скелет из loading.tsx, а потом заменяет
 * его страницей — но только то, что ниже layout. Когда у скелета и страницы
 * было по своей шапке, она создавалась дважды, и мазок под «Галереей»
 * рисовался два раза подряд. Layout при этой замене остаётся на месте.
 */
export default function GalleryListLayout({ children }: LayoutProps<"/gallery">) {
  return (
    <div className="bg-wall flex min-h-svh flex-col">
      <Header />
      {children}
    </div>
  );
}
