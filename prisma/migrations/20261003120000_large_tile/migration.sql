-- Флаг «показывать крупно» в коллаже галереи (03.10.2026).
--
-- По умолчанию false: у уже заведённых работ раскладка не меняется,
-- пока художница сама не включит переключатель в админке.

-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "isLarge" BOOLEAN NOT NULL DEFAULT false;
