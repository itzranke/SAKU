-- M1 / ADR-022 — persistent closed-deal dedupe (processed_deals).
-- Written idempotently (IF NOT EXISTS / duplicate_object guard) so the SAME file can be:
--   * applied by `prisma migrate deploy` on a fresh database, and
--   * replayed by `prisma db execute` right after `prisma db push` in CI, which is how
--     this repo proves the migration SQL itself is valid on postgres:16.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DealSource" AS ENUM ('MT5_SYNC', 'STATEMENT', 'EA_LEGACY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "processed_deals" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "source" "DealSource" NOT NULL DEFAULT 'MT5_SYNC',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "processed_deals_account_ticket_key" ON "processed_deals" ("account", "ticket");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "processed_deals_account_syncedAt_idx" ON "processed_deals" ("account", "syncedAt");
