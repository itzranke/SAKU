-- M2 verification probe: the connector table must exist, and the ciphertext column must
-- have a NOT NULL constraint (a nullable cipher column would silently allow plaintext
-- side-columns to appear later). Raises -> CI fails loudly.
DO $$
DECLARE
    v_table TEXT;
    v_null  TEXT;
    v_uniq  TEXT;
BEGIN
    v_table := to_regclass('public.integration_accounts')::text;
    IF v_table IS NULL THEN
        RAISE EXCEPTION 'SAKU M2: table integration_accounts is missing';
    END IF;

    SELECT c.is_nullable INTO v_null
    FROM information_schema.columns c
    WHERE c.table_name = 'integration_accounts' AND c.column_name = 'credentialCipher';
    IF v_null IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION 'SAKU M2: integration_accounts.credentialCipher must be NOT NULL';
    END IF;

    SELECT i.indexname INTO v_uniq
    FROM pg_indexes i
    WHERE i.tablename = 'integration_accounts'
      AND i.indexname = 'integration_accounts_ownerId_type_login_key';
    IF v_uniq IS NULL THEN
        RAISE EXCEPTION 'SAKU M2: unique index (ownerId,type,login) is missing';
    END IF;
END $$;
