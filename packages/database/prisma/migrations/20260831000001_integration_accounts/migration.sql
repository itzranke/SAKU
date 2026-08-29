-- M2 / ADR-022 — connector registry with credentials encrypted at rest.
-- Idempotent (same replay rule as the M1 migration): safe for `migrate deploy`
-- on a fresh database and for `prisma db execute` right after `prisma db push` in CI.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "IntegrationType" AS ENUM ('MT5_CLOUD', 'MT5_STATEMENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "integration_accounts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL DEFAULT 'user-local',
    "type" "IntegrationType" NOT NULL,
    "label" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "port" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "credentialCipher" TEXT NOT NULL,
    "vendorAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "integration_accounts_ownerId_type_login_key"
    ON "integration_accounts" ("ownerId", "type", "login");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integration_accounts_ownerId_enabled_idx"
    ON "integration_accounts" ("ownerId", "enabled");
