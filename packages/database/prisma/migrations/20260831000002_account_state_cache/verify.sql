-- M3 verification probe: the display cache exists (one row per integration) and the
-- ledger source enum carries EA_LEGACY so legacy-EA journals remain distinguishable.
-- (v2, 2026-08-30: enum check memakai IF NOT EXISTS. Sebelumnya count(*) ditampung ke
--  v_src TEXT lalu dibandingkan `v_src = 0` — postgres:16 menolak `text = integer`.)
DO $$
DECLARE
    v_table TEXT;
BEGIN
    v_table := to_regclass('public.account_state_cache')::text;
    IF v_table IS NULL THEN
        RAISE EXCEPTION 'SAKU M3: table account_state_cache is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'SourceType' AND e.enumlabel = 'EA_LEGACY'
    ) THEN
        RAISE EXCEPTION 'SAKU M3: SourceType enum is missing EA_LEGACY';
    END IF;
END $$;
