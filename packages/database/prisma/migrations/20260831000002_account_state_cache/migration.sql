-- M3 / ADR-022 — display-only snapshot cache + EA_LEGACY provenance for journals.
-- Idempotent, replayable after `prisma db push` (see the M1/M2 migrations for the rule).

-- AlterEnum: journals produced by the deprecated push bridge stay distinguishable.
DO $$ BEGIN
    ALTER TYPE "SourceType" ADD VALUE 'EA_LEGACY';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL; -- PG < 12 refused ADD VALUE inside a transaction block
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "account_state_cache" (
    "id" TEXT NOT NULL,
    "integrationAccountId" TEXT NOT NULL,
    "equity" DECIMAL(20,4) NOT NULL,
    "balance" DECIMAL(20,4) NOT NULL,
    "margin" DECIMAL(20,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "serverTime" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_state_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "account_state_cache_integrationAccountId_key"
    ON "account_state_cache" ("integrationAccountId");
