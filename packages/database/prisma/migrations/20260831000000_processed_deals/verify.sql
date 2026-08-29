-- M1 verification probe (run with: pnpm --filter @saku/database exec prisma db execute
--   --file prisma/migrations/20260831000000_processed_deals/verify.sql --schema schema.prisma)
-- Raises a hard error if the dedupe table or its uniqueness constraint is missing,
-- so CI fails loudly instead of silently degrading to the in-memory Set.
DO $$
DECLARE
    v_table TEXT;
    v_uniq  TEXT;
BEGIN
    v_table := to_regclass('public.processed_deals')::text;
    IF v_table IS NULL THEN
        RAISE EXCEPTION 'SAKU M1: table processed_deals is missing';
    END IF;

    SELECT i.indexname INTO v_uniq
    FROM pg_indexes i
    WHERE i.tablename = 'processed_deals' AND i.indexname = 'processed_deals_account_ticket_key';
    IF v_uniq IS NULL THEN
        RAISE EXCEPTION 'SAKU M1: unique index processed_deals_account_ticket_key (account,ticket) is missing';
    END IF;
END $$;
