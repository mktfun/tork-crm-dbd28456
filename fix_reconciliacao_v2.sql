-- =====================================================
-- FIX RECONCILIAÇÃO FINAL (SEM updated_at, COM total_amount)
-- Cole no SQL Editor do Supabase
-- =====================================================

-- 1. Corrige a RPC de Conciliação removendo a coluna inexistente 'updated_at'
-- O trigger trg_update_bank_balance_on_reconcile vai cuidar do saldo
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Atualiza apenas o que é necessário para o fluxo de saldo
  UPDATE financial_transactions 
  SET reconciled = TRUE
  WHERE id = p_transaction_id 
    AND user_id = v_user_id
    AND NOT COALESCE(reconciled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC de listagem para conciliação (Otimizada)
-- Usa total_amount se existir, senão soma do ledger
CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(p_bank_account_id UUID)
RETURNS TABLE (
  id UUID, 
  description TEXT, 
  amount NUMERIC, 
  transaction_date DATE, 
  category_name TEXT
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
    -- Prioriza o total_amount do cabeçalho, se zero, tenta somar o ledger
    COALESCE(
      NULLIF(t.total_amount, 0), 
      (SELECT SUM(ABS(amount)) FROM financial_ledger WHERE transaction_id = t.id)
    ) as amount,
    t.transaction_date, -- Usando transaction_date (payment_date não existe)
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

-- 3. Limpeza de dados: Povoa os total_amount nulos
UPDATE financial_transactions ft
SET total_amount = sub.total
FROM (
    SELECT transaction_id, SUM(ABS(amount)) as total
    FROM financial_ledger
    GROUP BY transaction_id
) AS sub
WHERE ft.id = sub.transaction_id 
  AND (ft.total_amount IS NULL OR ft.total_amount = 0);
