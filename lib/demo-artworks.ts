/**
 * Демонстрационные работы из макета.
 *
 * ВРЕМЕННО. На этапе 3 эти данные заменит выборка из базы через Prisma, а
 * файл будет удалён. Формат полей нарочно повторяет будущую модель `Artwork`,
 * чтобы замена свелась к подмене источника, а не переписыванию разметки.
 */

export type DemoArtwork = {
  id: number;
  title: string;
  /** Техника: «Холст, масло» и т.п. */
  medium: string;
  /** Размеры полотна. */
  size: string;
  status: "available" | "sold";
  /** Путь к фотографии. Реальных снимков пока нет — рисуется заглушка. */
  src?: string;
};

export const demoArtworks: DemoArtwork[] = [
  { id: 1, title: "Утренний свет", medium: "Холст, масло", size: "50×70 см", status: "available" },
  { id: 2, title: "Полевые цветы", medium: "Холст, акрил", size: "40×50 см", status: "available" },
  { id: 3, title: "Старый двор", medium: "Холст, масло", size: "60×80 см", status: "sold" },
  { id: 4, title: "Тишина ущелья", medium: "Холст, масло", size: "70×90 см", status: "available" },
  { id: 5, title: "Зимний сад", medium: "Холст, акрил", size: "45×60 см", status: "sold" },
  { id: 6, title: "Дорога домой", medium: "Холст, масло", size: "50×60 см", status: "available" },
  { id: 7, title: "Вечер в горах", medium: "Холст, масло", size: "80×100 см", status: "available" },
  {
    id: 8,
    title: "Натюрморт с грушами",
    medium: "Холст, масло",
    size: "35×45 см",
    status: "sold",
  },
  { id: 9, title: "Осенний сад", medium: "Холст, акрил", size: "55×70 см", status: "available" },
];

/** Работы, которые крутятся фоном в hero. */
export const heroArtworks = demoArtworks.filter((w) =>
  ["Утренний свет", "Вечер в горах", "Тишина ущелья"].includes(w.title),
);
