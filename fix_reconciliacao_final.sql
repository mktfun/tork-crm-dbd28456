-- =====================================================
-- RECONCILIAÇÃO FINAL: Versão Corrigida
-- (Sem total_amount, payment_date ou type - colunas que não existem)
-- =====================================================

-- =====================================================
-- 1. Garantir coluna reconciled
-- =====================================================
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false;

-- =====================================================
-- 2. Trigger: atualiza saldo APENAS ao reconciliar
-- Lê do ledger (não de total_amount que não existe)
-- =====================================================
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_net_amount numeric;
BEGIN
    -- Só atualiza se marcou como conciliado AGORA
    IF NEW.reconciled = true AND COALESCE(OLD.reconciled, false) = false THEN
        -- Calcula impacto a partir do ledger
        SELECT COALESCE(SUM(
            CASE 
                WHEN fa.type = 'revenue' THEN ABS(fl.amount) 
                WHEN fa.type = 'expense' THEN -ABS(fl.amount)
                ELSE 0
            END
        ), 0) INTO v_net_amount
        FROM financial_ledger fl
        JOIN financial_accounts fa ON fl.account_id = fa.id
        WHERE fl.transaction_id = NEW.id;

        UPDATE bank_accounts 
        SET current_balance = current_balance + v_net_amount,
            last_sync_date = NOW()
        WHERE id = NEW.bank_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_bank_balance ON financial_transactions;
DROP TRIGGER IF EXISTS trg_update_bank_balance_reconciled ON financial_transactions;
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconcile ON financial_transactions;

CREATE TRIGGER trg_update_bank_balance_on_reconcile
  AFTER UPDATE OF reconciled ON financial_transactions
  FOR EACH ROW
  WHEN (NEW.bank_account_id IS NOT NULL)
  EXECUTE FUNCTION update_bank_balance_on_reconciliation();

-- =====================================================
-- 3. RPC: Conciliação Manual
-- =====================================================
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  UPDATE financial_transactions 
  SET reconciled = true
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND NOT COALESCE(is_void, false);
END;
$$;

-- =====================================================
-- 4. Recalibrar: ZERAR tudo, recontar só conciliados
-- =====================================================
UPDATE bank_accounts SET current_balance = 0;

UPDATE bank_accounts ba
SET current_balance = COALESCE(sub.reconciled_balance, 0)
FROM (
    SELECT 
        ft.bank_account_id,
        SUM(
            CASE 
                WHEN fa.type = 'revenue' THEN ABS(fl.amount)
                WHEN fa.type = 'expense' THEN -ABS(fl.amount)
                ELSE 0 
            END
        ) AS reconciled_balance
    FROM financial_ledger fl
    JOIN financial_transactions ft ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE ft.bank_account_id IS NOT NULL
      AND ft.reconciled = true
      AND NOT COALESCE(ft.is_void, false)
    GROUP BY ft.bank_account_id
) sub
WHERE sub.bank_account_id = ba.id;

-- =====================================================
-- 5. DIAGNÓSTICO
-- =====================================================
-- SELECT 
--   ba.bank_name,
--   ba.current_balance as saldo_real,
--   (SELECT COUNT(*) FROM financial_transactions ft 
--    WHERE ft.bank_account_id = ba.id AND ft.reconciled = true) as conciliadas,
--   (SELECT COUNT(*) FROM financial_transactions ft 
--    WHERE ft.bank_account_id = ba.id 
--    AND ft.status IN ('confirmed', 'completed')
--    AND NOT COALESCE(ft.reconciled, false)) as pendentes
-- FROM bank_accounts ba
-- ORDER BY ba.bank_name;
