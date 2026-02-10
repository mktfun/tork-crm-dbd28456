-- =====================================================
-- FIX: Recalcula saldos CORRETAMENTE
-- O sync anterior filtrou por status IN ('confirmed','completed')
-- mas muitas transações usam outros status.
-- Agora inclui TODAS as transações não-void que possuem banco.
-- =====================================================

-- Recalcula saldos incluindo TODOS os status (exceto void)
UPDATE bank_accounts ba
SET current_balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN ft.type IN ('revenue', 'receita') THEN ABS(COALESCE(ft.total_amount, 0))
            WHEN ft.type IN ('expense', 'despesa') THEN -ABS(COALESCE(ft.total_amount, 0))
            ELSE 0 
        END
    ), 0)
    FROM financial_transactions ft
    WHERE ft.bank_account_id = ba.id 
    AND NOT COALESCE(ft.is_void, false)
);

-- Atualiza o trigger para NÃO restringir por status
-- (o saldo reflete TODAS as transações vinculadas ao banco)
CREATE OR REPLACE FUNCTION public.update_bank_balance_immediately()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_impact NUMERIC;
BEGIN
    -- INSERT: adiciona impacto se tiver banco
    IF TG_OP = 'INSERT' AND NEW.bank_account_id IS NOT NULL AND NOT COALESCE(NEW.is_void, false) THEN
        v_impact := CASE 
            WHEN NEW.type IN ('revenue', 'receita') THEN ABS(COALESCE(NEW.total_amount, 0)) 
            WHEN NEW.type IN ('expense', 'despesa') THEN -ABS(COALESCE(NEW.total_amount, 0))
            ELSE 0 
        END;

        IF v_impact <> 0 THEN
            UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
        END IF;

    -- UPDATE: recalcula se banco mudou, void mudou, ou amount mudou
    ELSIF TG_OP = 'UPDATE' THEN
        -- Se ficou void agora, reverte o impacto
        IF COALESCE(NEW.is_void, false) = true AND COALESCE(OLD.is_void, false) = false AND OLD.bank_account_id IS NOT NULL THEN
            v_impact := CASE 
                WHEN OLD.type IN ('revenue', 'receita') THEN -ABS(COALESCE(OLD.total_amount, 0))
                WHEN OLD.type IN ('expense', 'despesa') THEN ABS(COALESCE(OLD.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = OLD.bank_account_id;
            END IF;
        END IF;

        -- Se banco mudou (late binding), adiciona no novo banco
        IF NEW.bank_account_id IS NOT NULL AND OLD.bank_account_id IS NULL AND NOT COALESCE(NEW.is_void, false) THEN
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita') THEN ABS(COALESCE(NEW.total_amount, 0))
                WHEN NEW.type IN ('expense', 'despesa') THEN -ABS(COALESCE(NEW.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Recria trigger para disparar em INSERT e UPDATE
DROP TRIGGER IF EXISTS trg_update_bank_balance_immediate ON financial_transactions;
CREATE TRIGGER trg_update_bank_balance_immediate
AFTER INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_immediately();
