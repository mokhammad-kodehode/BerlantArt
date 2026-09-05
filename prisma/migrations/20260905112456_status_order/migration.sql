-- Переупорядочивание значений enum ArtworkStatus: AVAILABLE, RESERVED, SOLD.
--
-- Написано руками: Prisma сравнивает только набор значений enum, а не их
-- порядок, поэтому автоматическая миграция вышла пустой. Порядок при этом
-- значим — PostgreSQL сортирует enum в порядке объявления, а галерея
-- сортирует карточки по статусу (см. lib/artworks.ts).
--
-- Переставить значения на месте PostgreSQL не умеет, поэтому тип создаётся
-- заново, а колонка переводится на него через текст. Умолчание снимается
-- на время перевода: оно ссылается на старый тип и без этого блокирует
-- ALTER COLUMN.

ALTER TYPE "ArtworkStatus" RENAME TO "ArtworkStatus_old";

CREATE TYPE "ArtworkStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

ALTER TABLE "Artwork" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Artwork"
  ALTER COLUMN "status" TYPE "ArtworkStatus"
  USING ("status"::text::"ArtworkStatus");

ALTER TABLE "Artwork" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

DROP TYPE "ArtworkStatus_old";
