-- Размер фото в пикселях — для примерки через камеру (AR-1, TICKETS-ar.md).
--
-- Столбцы необязательные: у уже загруженных фото размера нет, пока его
-- не проставит scripts/backfill-image-sizes.ts. Без размера сайт работает
-- как прежде — просто у работы нет кнопки «Через камеру».

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;
