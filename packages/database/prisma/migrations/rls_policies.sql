-- SAKU MULTI-TENANT ROW-LEVEL SECURITY (RLS) POLICIES
-- Enforces account-level and workspace-level isolation across household members

ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;

-- 1. Workspace Isolation Policy
CREATE POLICY workspace_isolation_policy ON "workspaces"
    FOR ALL
    USING (id = current_setting('app.current_workspace_id', true));

-- 2. Account Isolation Policy (Supports Household Shared vs Private Accounts)
CREATE POLICY account_household_policy ON "accounts"
    FOR ALL
    USING (
        workspace_id = current_setting('app.current_workspace_id', true)
        AND (is_private = false OR created_by_user_id = current_setting('app.current_user_id', true))
    );

-- 3. Transaction Lineage Policy
CREATE POLICY transaction_isolation_policy ON "transactions"
    FOR ALL
    USING (workspace_id = current_setting('app.current_workspace_id', true));
