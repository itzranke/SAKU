-- Verifikasi ADR-024: tabel sesi ada, PK-nya tokenHash, dan tidak ada kolom yang
-- terlihat menampung token mentah (kontrak: hash-only).
DO $$
DECLARE
    v_table TEXT;
BEGIN
    v_table := to_regclass('public.auth_sessions')::text;
    IF v_table IS NULL THEN
        RAISE EXCEPTION 'SAKU ADR-024: table auth_sessions is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'auth_sessions' AND column_name = 'tokenHash'
    ) THEN
        RAISE EXCEPTION 'SAKU ADR-024: auth_sessions.tokenHash is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'auth_sessions' AND column_name = 'expiresAt'
    ) THEN
        RAISE EXCEPTION 'SAKU ADR-024: auth_sessions.expiresAt is missing';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'auth_sessions' AND column_name IN ('token', 'sessionToken', 'secret')
    ) THEN
        RAISE EXCEPTION 'SAKU ADR-024: auth_sessions must store hashes only';
    END IF;
END $$;
