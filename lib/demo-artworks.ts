/**
 * Работы для разработки.
 *
 * ВРЕМЕННО. Схема и выборки уже готовы (этап 3), но страницы переедут на
 * них в составе этапа 4 — тогда этот файл будет удалён. Формат полей
 * нарочно повторяет модель `Artwork` из prisma/schema.prisma, чтобы замена
 * свелась к подмене источника, а не переписыванию разметки.
 *
 * Изображения — превью из Instagram художницы (@art_berlant), 225-600px по
 * длинной стороне. Их достаточно, чтобы оценить, как дизайн держит настоящую
 * живопись, но для боевого сайта нужны оригиналы: требования в
 * docs/foto-rabot.md.
 *
 * Названия и техника проставлены по виду работ и требуют подтверждения
 * художницы. Размеры холстов неизвестны — поле оставлено пустым намеренно,
 * выдумывать цифры для карточки товара нельзя.
 */

export type DemoArtwork = {
  id: number;
  title: string;
  /** Техника: «Холст, масло» и т.п. */
  medium: string;
  /** Размеры полотна. Пока неизвестны — подпись строится без них. */
  size?: string;
  status: "available" | "sold";
  /** Путь к фотографии. Без него рисуется цветная заглушка. */
  src?: string;
};

export const demoArtworks: DemoArtwork[] = [
  {
    id: 1,
    title: "Башни в тумане",
    medium: "Холст, масло",
    status: "available",
    src: "/artworks/bashni-v-tumane.jpg",
  },
  {
    id: 2,
    title: "Башни на закате",
    medium: "Холст, масло",
    status: "available",
    src: "/artworks/bashni-na-zakate.jpg",
  },
  {
    id: 3,
    title: "Дом с бирюзовыми ставнями",
    medium: "Холст, масло",
    status: "available",
    src: "/artworks/dom-s-biryuzovymi-stavnyami.jpg",
  },
  {
    id: 4,
    title: "Мост на закате",
    medium: "Холст, масло",
    status: "sold",
    src: "/artworks/most-na-zakate.jpg",
  },
  {
    id: 5,
    title: "Ночной свет",
    medium: "Холст, масло",
    status: "available",
    src: "/artworks/nochnoy-svet.jpg",
  },
];

/** Подпись под работой: техника и размер, если размер известен. */
export function artworkCaption(work: DemoArtwork): string {
  return [work.medium, work.size].filter(Boolean).join(" · ");
}
