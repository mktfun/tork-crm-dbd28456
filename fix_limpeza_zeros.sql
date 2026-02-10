-- =====================================================
-- LIMPEZA FINAL DE ZEROS E AJUSTE DE RECONCILIAÇÃO
-- (Cole no SQL Editor)
-- =====================================================

-- 1. Força a limpeza de Zeros baseada no Ledger (Execução Única e Violenta)
UPDATE financial_transactions ft
SET total_amount = sub.total
FROM (
    SELECT transaction_id, SUM(ABS(amount)) as total
    FROM financial_ledger
    GROUP BY transaction_id
) AS sub
WHERE ft.id = sub.transaction_id 
  AND (ft.total_amount = 0 OR ft.total_amount IS NULL);

-- 2. Melhora a RPC de Conciliação para garantir que o banco entenda a mudança
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(p_transaction_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Força o update para disparar o trigger de saldo
    -- Adicionamos updated_at = NOW() para garantir que o Postgres veja a mudança
    UPDATE financial_transactions 
    SET reconciled = TRUE,
        updated_at = NOW()
    WHERE id = p_transaction_id 
      -- Só atualiza se ainda não estiver conciliado
      AND (reconciled = FALSE OR reconciled IS NULL);
END;
$$ LANGUAGE plpgsql;
