
-- Step 1: Add archived column and create audit log table
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.reconciliation_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    statement_entry_id uuid REFERENCES bank_statement_entries(id) ON DELETE SET NULL,
    system_transaction_id uuid REFERENCES financial_transactions(id) ON DELETE SET NULL,
    bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
    amount numeric,
    operator_name text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reconciliation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audit logs" ON public.reconciliation_audit_log
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
