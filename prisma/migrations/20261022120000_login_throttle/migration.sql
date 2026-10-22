-- Счётчик попыток входа в админку (тикет О-16, 22.10.2026).
--
-- Только новая таблица: существующие не меняются, старый код сайта
-- её просто не замечает, поэтому миграция применяется до выкладки.

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);
