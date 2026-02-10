-- =====================================================
-- FAXINA ATÔMICA: Limpa TODAS as assinaturas conflitantes
-- e recria as versões definitivas.
-- Deve ser rodado como um bloco único no SQL Editor.
-- =====================================================

-- ===== PARTE 1: get_bank_statement_detailed =====
-- DROP obrigatório: estamos mudando o RETURNS TABLE (adicionando bank_account_id)
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

-- ===== PARTE 2: manual_reconcile_transaction =====
-- Remove TODAS as sobrecargas para evitar "best candidate" 
DROP FUNCTION IF EXISTS public.manual_reconcile_transaction(uuid);
DROP FUNCTION IF EXISTS public.manual_reconcile_transaction(uuid, uuid);

-- Recria a versão DEFINITIVA com parâmetro opcional
CREATE OR REPLACE FUNCTION public.manual_reconcile_transaction(
    p_transaction_id UUID,
    p_bank_account_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Se informou banco, vincula antes de conciliar
  IF p_bank_account_id IS NOT NULL THEN
    UPDATE financial_transactions
    SET bank_account_id = p_bank_account_id
    WHERE id = p_transaction_id
      AND user_id = v_user_id
      AND NOT COALESCE(is_void, false);
  END IF;

  -- Valida: transação precisa ter banco para conciliar
  IF NOT EXISTS (
    SELECT 1 FROM financial_transactions 
    WHERE id = p_transaction_id 
      AND user_id = v_user_id
      AND bank_account_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível conciliar uma transação sem conta bancária vinculada.';
  END IF;

  -- Concilia (dispara trigger de saldo)
  UPDATE financial_transactions
  SET reconciled = true,
      reconciliation_method = 'manual',
      reconciled_at = NOW()
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND NOT COALESCE(is_void, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_reconcile_transaction(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_reconcile_transaction(uuid, uuid) TO service_role;
