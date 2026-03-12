-- =====================================================
-- SALDO IMEDIATO: Atualiza bank_accounts no momento
-- da criação/confirmação da transação.
-- Reconciliação passa a ser apenas flag visual/auditoria.
-- =====================================================

-- 1. Remove TODOS os gatilhos antigos de conciliação (todas as variações de nome)
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconciliation ON financial_transactions;
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconcile ON financial_transactions;
DROP TRIGGER IF EXISTS trg_update_bank_balance_reconciled ON financial_transactions;
DROP FUNCTION IF EXISTS update_bank_balance_on_reconciliation() CASCADE;

-- 2. Cria função de saldo IMEDIATO
CREATE OR REPLACE FUNCTION public.update_bank_balance_immediately()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_impact NUMERIC;
BEGIN
    -- Só processa se tiver banco vinculado e status confirmado
    IF NEW.bank_account_id IS NOT NULL AND NEW.status IN ('confirmed', 'completed') THEN
        
        -- Se for INSERT novo OU status mudou para confirmado agora
        IF (TG_OP = 'INSERT') OR (OLD.status NOT IN ('confirmed', 'completed')) THEN
            
            -- Receita (+) / Despesa (-)
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita') THEN ABS(NEW.total_amount) 
                WHEN NEW.type IN ('expense', 'despesa') THEN -ABS(NEW.total_amount)
                ELSE 0 
            END;

            IF v_impact <> 0 THEN
                UPDATE bank_accounts 
                SET current_balance = current_balance + v_impact
                WHERE id = NEW.bank_account_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Instala o gatilho
DROP TRIGGER IF EXISTS trg_update_bank_balance_immediate ON financial_transactions;
CREATE TRIGGER trg_update_bank_balance_immediate
AFTER INSERT OR UPDATE OF status ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_immediately();

-- 4. Sincronização: Recalcula saldos baseado em TODAS as transações confirmadas
UPDATE bank_accounts ba
SET current_balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN ft.type IN ('revenue', 'receita') THEN ABS(ft.total_amount)
            WHEN ft.type IN ('expense', 'despesa') THEN -ABS(ft.total_amount)
            ELSE 0 
        END
    ), 0)
    FROM financial_transactions ft
    WHERE ft.bank_account_id = ba.id 
    AND ft.status IN ('confirmed', 'completed')
    AND NOT COALESCE(ft.is_void, false)
);
