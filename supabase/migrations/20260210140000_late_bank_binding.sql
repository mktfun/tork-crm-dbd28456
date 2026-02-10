-- =====================================================
-- EVOLUÇÃO: Vínculo Tardio de Banco na Conciliação
-- Permite conciliar transações que nasceram sem banco,
-- vinculando o banco no momento da conciliação.
-- =====================================================

-- 1. Evolui a RPC manual_reconcile_transaction para aceitar banco opcional
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(
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

  -- Verifica se a transação tem banco vinculado (obrigatório para saldo)
  IF NOT EXISTS (
    SELECT 1 FROM financial_transactions 
    WHERE id = p_transaction_id 
      AND user_id = v_user_id
      AND bank_account_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível conciliar uma transação sem conta bancária vinculada.';
  END IF;

  -- Liquida a transação (dispara o trigger de saldo)
  UPDATE financial_transactions
  SET reconciled = true,
      reconciliation_method = 'manual',
      reconciled_at = NOW()
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND NOT COALESCE(is_void, false);
END;
$$;
