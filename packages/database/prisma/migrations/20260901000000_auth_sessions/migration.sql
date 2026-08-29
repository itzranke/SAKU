-- ADR-024 fase 2 — persistensi sesi auth.
-- HANYA hash token (SHA-256 hex) yang disimpan; token mentah tidak pernah masuk DB.
-- Idempotent & replayable (kebijakan repo: `prisma db execute`, BUKAN `migrate dev|deploy`).

CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "tokenHash" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("tokenHash")
);

-- Lookup sesi aktif saat boot + sapu bersih kadaluarsa.
CREATE INDEX IF NOT EXISTS "auth_sessions_expiresAt_idx" ON "auth_sessions" ("expiresAt");
CREATE INDEX IF NOT EXISTS "auth_sessions_ownerId_idx" ON "auth_sessions" ("ownerId");
