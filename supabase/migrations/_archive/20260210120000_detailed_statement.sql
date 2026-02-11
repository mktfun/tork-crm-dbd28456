-- =====================================================
-- DETAILED BANK STATEMENT & AUDIT SCHEMA
-- =====================================================

-- 1. Add audit and identification columns
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciliation_method TEXT DEFAULT 'manual'; -- 'manual' or 'statement'

-- 2. Detailed Statement RPC with Progressive Balance
CREATE OR REPLACE FUNCTION get_bank_statement_detailed(
    p_bank_account_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    id UUID,
    payment_date DATE,
    document_number TEXT,
    description TEXT,
    category_name TEXT,
    revenue_amount NUMERIC,
    expense_amount NUMERIC,
    running_balance NUMERIC,
    status TEXT,
    reconciled BOOLEAN,
    method TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH movements AS (
        SELECT 
            t.id,
            t.payment_date,
            t.document_number,
            t.description,
            (SELECT string_agg(fa.name, ', ') FROM financial_ledger fl JOIN financial_accounts fa ON fl.account_id = fa.id WHERE fl.transaction_id = t.id) as cat_name,
            -- Logic to determine Revenue vs Expense based on Type
            CASE WHEN t.type = 'revenue' THEN t.total_amount ELSE 0 END as rev,
            CASE WHEN t.type = 'expense' THEN t.total_amount ELSE 0 END as exp,
            -- Impact logic: Revenue (+) vs Expense (-)
            CASE WHEN t.type = 'revenue' THEN t.total_amount ELSE -t.total_amount END as impact,
            t.status,
            t.reconciled,
            t.reconciliation_method,
            t.created_at
        FROM financial_transactions t
        WHERE (t.bank_account_id = p_bank_account_id OR p_bank_account_id IS NULL)
          AND NOT COALESCE(t.is_void, false)
          AND t.payment_date BETWEEN p_start_date AND p_end_date
        ORDER BY t.payment_date ASC, t.created_at ASC
    )
    SELECT 
        m.id, m.payment_date, m.document_number, m.description, m.cat_name,
        m.rev, m.exp,
        -- Running Balance Logic:
        -- 1. Calculate cumulative sum of impacts within the fetched range
        -- 2. Adjust base balance: Current Balance - Sum of impacts of ALL fetched movements 
        --    (This approach assumes the range ends 'now' or close to it. If pagination is used for historical data, 
        --     this might need refinement, but matches user request logic for now).
        SUM(m.impact) OVER (ORDER BY m.payment_date ASC, m.created_at ASC) + 
        COALESCE((SELECT current_balance - SUM(impact) FROM movements), 0) as running_balance,
        m.status, m.reconciled, m.reconciliation_method
    FROM movements m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
