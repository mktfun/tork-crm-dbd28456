-- =====================================================
-- FIX: get_bank_statement_detailed
-- Errors:
--   1. "column t.payment_date does not exist" → actual column is transaction_date
--   2. "operator does not exist: text = uuid" → missing ::uuid cast on bank_account_id comparison
-- =====================================================

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
    method TEXT,
    bank_account_id UUID
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_base_balance NUMERIC := 0;
BEGIN
    -- Obter saldo base da conta (antes do período solicitado)
    IF p_bank_account_id IS NOT NULL THEN
        SELECT COALESCE(ba.current_balance, 0) INTO v_base_balance
        FROM bank_accounts ba
        WHERE ba.id = p_bank_account_id AND ba.user_id = v_user_id;

        -- Subtrair impacto de TODAS as transações não-void dessa conta para obter saldo "zero"
        -- e depois somar apenas as transações até p_start_date para ter o saldo base correto.
        -- Simplificação: usar current_balance e subtrair as do período para frente.
    END IF;

    RETURN QUERY
    WITH movements AS (
        SELECT 
            t.id,
            t.transaction_date AS tx_date,  -- Coluna real é transaction_date, alias tx_date
            t.document_number,
            t.description,
            (SELECT string_agg(fa.name, ', ') 
             FROM financial_ledger fl 
             JOIN financial_accounts fa ON fl.account_id = fa.id 
             WHERE fl.transaction_id = t.id) AS cat_name,
            CASE WHEN t.type = 'revenue' THEN COALESCE(t.total_amount, 0) ELSE 0 END AS rev,
            CASE WHEN t.type = 'expense' THEN COALESCE(t.total_amount, 0) ELSE 0 END AS exp,
            CASE WHEN t.type = 'revenue' THEN COALESCE(t.total_amount, 0) 
                 ELSE -COALESCE(t.total_amount, 0) END AS impact,
            t.status,
            t.reconciled,
            t.reconciliation_method,
            t.created_at,
            t.bank_account_id AS tx_bank_account_id
        FROM financial_transactions t
        WHERE t.user_id = v_user_id
          AND (p_bank_account_id IS NULL OR t.bank_account_id = p_bank_account_id::uuid)
          AND NOT COALESCE(t.is_void, false)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
        ORDER BY t.transaction_date ASC, t.created_at ASC
    )
    SELECT 
        m.id, 
        m.tx_date,                      -- Aliased back to payment_date for frontend compatibility 
        m.document_number, 
        m.description, 
        m.cat_name,
        m.rev, 
        m.exp,
        SUM(m.impact) OVER (ORDER BY m.tx_date ASC, m.created_at ASC) AS running_balance,
        m.status, 
        m.reconciled, 
        m.reconciliation_method,
        m.tx_bank_account_id
    FROM movements m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
