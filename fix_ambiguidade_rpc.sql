-- =====================================================
-- FIX AMBIGUIDADE RPC (out_ prefix)
-- =====================================================

-- 1. Remove a versão bugada (se existir com outra assinatura)
DROP FUNCTION IF EXISTS get_transactions_for_reconciliation(UUID);

-- 2. Recria com nomes de saída protegidos contra colisão (out_*)
-- Isso evita o erro "42702: column reference is ambiguous"
CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(p_bank_account_id UUID)
RETURNS TABLE (
    out_id UUID, 
    out_description TEXT, 
    out_amount NUMERIC, 
    out_transaction_date DATE, 
    out_category_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT 
    t.id, 
    t.description, 
    -- Cálculo do valor (prioriza total_amount, fallback para ledger)
    COALESCE(
        NULLIF(t.total_amount, 0), 
        (SELECT SUM(ABS(l.amount)) 
         FROM financial_ledger l 
         WHERE l.transaction_id = t.id)
    ) as calculated_amount,
    t.transaction_date,
    COALESCE(
        (SELECT string_agg(DISTINCT fa.name, ', ') 
         FROM financial_ledger fl 
         JOIN financial_accounts fa ON fl.account_id = fa.id 
         WHERE fl.transaction_id = t.id), 
        'Sem categoria'
    ) as category_name
  FROM financial_transactions t
  WHERE t.bank_account_id = p_bank_account_id
    AND t.user_id = v_user_id
    AND NOT COALESCE(t.reconciled, FALSE)
    AND t.status IN ('confirmed', 'completed')
    AND NOT COALESCE(t.is_void, FALSE)
  ORDER BY t.transaction_date DESC;
END;
$$;
