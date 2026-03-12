-- =====================================================
-- PADRONIZAÇÃO: transaction_date como lei
-- Atualiza RPCs para usar nomes de coluna corretos
-- =====================================================

-- 1. DROP obrigatório para mudar RETURNS TABLE
DROP FUNCTION IF EXISTS public.get_bank_statement_detailed(uuid, date, date);

-- 2. Recria get_bank_statement_detailed com transaction_date
CREATE OR REPLACE FUNCTION public.get_bank_statement_detailed(
    p_bank_account_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
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
BEGIN
    RETURN QUERY
    WITH movements AS (
        SELECT 
            t.id,
            t.transaction_date AS tx_date,
            t.document_number,
            t.description,
            COALESCE(
                (SELECT string_agg(fa.name, ', ') 
                 FROM financial_ledger fl 
                 JOIN financial_accounts fa ON fl.account_id = fa.id 
                 WHERE fl.transaction_id = t.id),
                'Sem categoria'
            ) AS cat_name,
            CASE WHEN t.type IN ('revenue', 'receita') THEN COALESCE(t.total_amount, 0) ELSE 0 END AS rev,
            CASE WHEN t.type IN ('expense', 'despesa') THEN COALESCE(t.total_amount, 0) ELSE 0 END AS exp,
            CASE WHEN t.type IN ('revenue', 'receita') THEN COALESCE(t.total_amount, 0) 
                 ELSE -COALESCE(t.total_amount, 0) END AS impact,
            CASE WHEN t.reconciled = TRUE THEN 'Conciliado' ELSE 'Pendente' END AS status_disp,
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
        m.id, m.tx_date, m.document_number, m.description, m.cat_name,
        m.rev, m.exp,
        SUM(m.impact) OVER (ORDER BY m.tx_date ASC, m.created_at ASC) AS running_balance,
        m.status_disp, m.reconciled, m.reconciliation_method, m.tx_bank_account_id
    FROM movements m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garante create_financial_movement com total_amount explícito
CREATE OR REPLACE FUNCTION create_financial_movement(
    p_description TEXT,
    p_amount NUMERIC,
    p_account_id UUID,
    p_bank_account_id UUID,
    p_transaction_date DATE,
    p_type TEXT
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO financial_transactions (
        user_id, description, total_amount, status, 
        transaction_date, bank_account_id, type, reconciled
    ) VALUES (
        v_user_id, p_description, ABS(p_amount), 'confirmed', 
        p_transaction_date, p_bank_account_id, p_type, FALSE
    ) RETURNING id INTO v_transaction_id;

    INSERT INTO financial_ledger (transaction_id, account_id, amount)
    VALUES (v_transaction_id, p_account_id, 
           CASE WHEN p_type IN ('revenue', 'receita') THEN -ABS(p_amount) ELSE ABS(p_amount) END);

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
