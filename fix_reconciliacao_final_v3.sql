-- =====================================================
-- FIX RECONCILIAÇÃO FINAL V3 (Cura da Coluna Fantasma)
-- =====================================================

-- 1. Remove a RPC problemática para garantia
DROP FUNCTION IF EXISTS manual_reconcile_transaction(UUID);

-- 2. Recria a RPC sem a coluna updated_at
CREATE OR REPLACE FUNCTION manual_reconcile_transaction(p_transaction_id UUID)
RETURNS void AS $$
BEGIN
    -- Verifica se a transação existe
    IF NOT EXISTS (SELECT 1 FROM financial_transactions WHERE id = p_transaction_id) THEN
        RAISE EXCEPTION 'Transação não encontrada.';
    END IF;

    -- Atualiza apenas o que existe (reconciled = TRUE)
    UPDATE financial_transactions 
    SET reconciled = TRUE
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Function para atualização de saldo
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
BEGIN
    -- Só executa se reconciled mudou de FALSE/NULL para TRUE
    IF NEW.reconciled = TRUE AND (OLD.reconciled = FALSE OR OLD.reconciled IS NULL) THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance + (
            CASE WHEN NEW.type = 'revenue' THEN NEW.total_amount ELSE -NEW.total_amount END
        )
        WHERE id = NEW.bank_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Vincula o trigger à tabela (Garante que ele exista)
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconcile ON financial_transactions;

CREATE TRIGGER trg_update_bank_balance_on_reconcile
AFTER UPDATE OF reconciled ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_on_reconciliation();
