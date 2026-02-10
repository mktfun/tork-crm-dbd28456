-- =====================================================
-- FAXINA ATÔMICA v2: RPC "Bala de Prata" + Trigger Blindado
-- DROP de todas as sobrecargas + recriação definitiva
-- =====================================================

-- ===== PARTE 1: get_bank_statement_detailed =====
DROP FUNCTION IF EXISTS public.get_bank_statement_detailed(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_bank_statement_detailed(
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
BEGIN
    RETURN QUERY
    WITH movements AS (
        SELECT 
            t.id,
            t.transaction_date AS tx_date,
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
        m.tx_date,
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

-- ===== PARTE 2: manual_reconcile_transaction (Bala de Prata) =====
DROP FUNCTION IF EXISTS public.manual_reconcile_transaction(uuid);
DROP FUNCTION IF EXISTS public.manual_reconcile_transaction(uuid, uuid);

CREATE OR REPLACE FUNCTION public.manual_reconcile_transaction(
    p_transaction_id UUID,
    p_bank_account_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update atômico: vincula banco (se fornecido) e concilia em uma só operação
    UPDATE financial_transactions 
    SET 
        bank_account_id = COALESCE(p_bank_account_id, bank_account_id),
        reconciled = TRUE,
        reconciled_at = NOW(),
        reconciliation_method = 'manual'
    WHERE id = p_transaction_id;

    -- Validação pós-update: garante que tem banco vinculado
    IF NOT EXISTS (
        SELECT 1 FROM financial_transactions 
        WHERE id = p_transaction_id 
          AND bank_account_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Erro: A transação precisa de uma conta bancária para ser conciliada.';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_reconcile_transaction(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_reconcile_transaction(uuid, uuid) TO service_role;

-- ===== PARTE 3: Trigger Blindado de Saldo =====
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_impact NUMERIC;
BEGIN
    IF NEW.reconciled = TRUE AND (OLD.reconciled = FALSE OR OLD.reconciled IS NULL) THEN
        -- Fonte da Verdade: Ledger Contábil
        SELECT SUM(CASE WHEN a.type = 'revenue' THEN ABS(l.amount) ELSE -ABS(l.amount) END)
        INTO v_impact
        FROM financial_ledger l
        JOIN financial_accounts a ON l.account_id = a.id
        WHERE l.transaction_id = NEW.id;

        -- Plano B: Cabeçalho da transação
        IF v_impact IS NULL THEN
            v_impact := CASE WHEN NEW.type = 'revenue' THEN ABS(NEW.total_amount) ELSE -ABS(NEW.total_amount) END;
        END IF;

        -- Atualiza saldo se temos valor e conta
        IF NEW.bank_account_id IS NOT NULL AND v_impact IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance + v_impact
            WHERE id = NEW.bank_account_id;
        END IF;

    ELSIF NEW.reconciled = FALSE AND OLD.reconciled = TRUE THEN
        -- Estorno: mesma lógica invertida
        SELECT SUM(CASE WHEN a.type = 'revenue' THEN ABS(l.amount) ELSE -ABS(l.amount) END)
        INTO v_impact
        FROM financial_ledger l
        JOIN financial_accounts a ON l.account_id = a.id
        WHERE l.transaction_id = NEW.id;

        IF v_impact IS NULL THEN
            v_impact := CASE WHEN NEW.type = 'revenue' THEN ABS(NEW.total_amount) ELSE -ABS(NEW.total_amount) END;
        END IF;

        IF OLD.bank_account_id IS NOT NULL AND v_impact IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance - v_impact
            WHERE id = OLD.bank_account_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garante que o trigger existe na tabela
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconciliation ON financial_transactions;
CREATE TRIGGER trg_update_bank_balance_on_reconciliation
    AFTER UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_balance_on_reconciliation();
