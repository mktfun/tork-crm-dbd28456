-- =====================================================
-- FIX RECONCILIAÇÃO SIMPLIFICADO (Nomes limpos)
-- =====================================================

-- 1. Remove a função problemática
DROP FUNCTION IF EXISTS get_transactions_for_reconciliation(UUID);

-- 2. Recria com nomes amigáveis (sem prefixo out_)
-- Garantimos que não haja ambiguidade qualificando todas as colunas
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
    -- Cálculo do valor (prioriza total_amount, fallback para ledger)
    COALESCE(
        NULLIF(t.total_amount, 0), 
        (SELECT SUM(ABS(l.amount)) 
         FROM financial_ledger l 
         WHERE l.transaction_id = t.id)
    ) as amount,
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

-- 3. Função de conciliação manual (parâmetro explícito)
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(p_transaction_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE financial_transactions 
    SET reconciled = TRUE,
        updated_at = NOW() -- Tenta atualizar updated_at se existir, se der erro removemos
    WHERE id = p_transaction_id;
    
    -- Se updated_at não existir na sua tabela, use a versão abaixo:
    -- UPDATE financial_transactions SET reconciled = TRUE WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;
