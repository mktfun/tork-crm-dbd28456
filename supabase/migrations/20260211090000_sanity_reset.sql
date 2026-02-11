-- =====================================================
-- RESET DE SANIDADE: RPC de criação blindada + trigger
-- corrigido + unreconcile + recálculo definitivo
-- =====================================================

-- 1. Garante que as colunas existem
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE;

-- 2. RPC de Criação Blindada (valor NUNCA será zero)
CREATE OR REPLACE FUNCTION create_financial_movement(
    p_description TEXT,
    p_amount NUMERIC,
    p_account_id UUID,
    p_bank_account_id UUID,
    p_transaction_date DATE,
    p_type TEXT
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_final_amount NUMERIC;
    v_user_id UUID := auth.uid();
BEGIN
    v_final_amount := ABS(p_amount);

    INSERT INTO financial_transactions (
        user_id, description, total_amount, status, transaction_date,
        bank_account_id, type, reconciled
    ) VALUES (
        v_user_id, p_description, v_final_amount, 'confirmed',
        p_transaction_date, p_bank_account_id, p_type, FALSE
    ) RETURNING id INTO v_transaction_id;

    -- Lançamento no Ledger (integridade contábil)
    INSERT INTO financial_ledger (transaction_id, account_id, amount)
    VALUES (
        v_transaction_id, p_account_id,
        CASE WHEN p_type IN ('revenue', 'receita', 'Entrada') THEN -v_final_amount ELSE v_final_amount END
    );

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger de Saldo Imediato (tipos exaustivos, sem filtro de status restritivo)
CREATE OR REPLACE FUNCTION update_bank_balance_immediately()
RETURNS TRIGGER AS $$
DECLARE
    v_impact NUMERIC;
BEGIN
    -- INSERT: se tem banco e não é void
    IF TG_OP = 'INSERT' AND NEW.bank_account_id IS NOT NULL AND NOT COALESCE(NEW.is_void, false) THEN
        v_impact := CASE 
            WHEN NEW.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(NEW.total_amount, 0)) 
            WHEN NEW.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(NEW.total_amount, 0))
            ELSE 0 
        END;
        IF v_impact <> 0 THEN
            UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Void: reverte impacto
        IF COALESCE(NEW.is_void, false) = true AND COALESCE(OLD.is_void, false) = false AND OLD.bank_account_id IS NOT NULL THEN
            v_impact := CASE 
                WHEN OLD.type IN ('revenue', 'receita', 'Entrada') THEN -ABS(COALESCE(OLD.total_amount, 0))
                WHEN OLD.type IN ('expense', 'despesa', 'Saída') THEN ABS(COALESCE(OLD.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = OLD.bank_account_id;
            END IF;
            RETURN NEW;
        END IF;

        -- Late binding: banco vinculado agora
        IF NEW.bank_account_id IS NOT NULL AND OLD.bank_account_id IS NULL AND NOT COALESCE(NEW.is_void, false) THEN
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(NEW.total_amount, 0))
                WHEN NEW.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(NEW.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
            END IF;
        END IF;

        -- Banco mudou
        IF NEW.bank_account_id IS NOT NULL AND OLD.bank_account_id IS NOT NULL 
           AND NEW.bank_account_id <> OLD.bank_account_id AND NOT COALESCE(NEW.is_void, false) THEN
            -- Remove do antigo
            v_impact := CASE 
                WHEN OLD.type IN ('revenue', 'receita', 'Entrada') THEN -ABS(COALESCE(OLD.total_amount, 0))
                WHEN OLD.type IN ('expense', 'despesa', 'Saída') THEN ABS(COALESCE(OLD.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = OLD.bank_account_id;
            END IF;
            -- Adiciona ao novo
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(NEW.total_amount, 0))
                WHEN NEW.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(NEW.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recria trigger
DROP TRIGGER IF EXISTS trg_update_bank_balance_immediate ON financial_transactions;
CREATE TRIGGER trg_update_bank_balance_immediate
AFTER INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION update_bank_balance_immediately();

-- 5. RPC de Unreconcile blindada
CREATE OR REPLACE FUNCTION unreconcile_transaction(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    UPDATE financial_transactions 
    SET reconciled = FALSE, reconciled_at = NULL, reconciliation_method = NULL
    WHERE id = p_transaction_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RECALCULO DEFINITIVO de saldos (sem filtro de status, sem payment_date)
UPDATE bank_accounts ba
SET current_balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN ft.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(ft.total_amount, 0))
            WHEN ft.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(ft.total_amount, 0))
            ELSE 0 
        END
    ), 0)
    FROM financial_transactions ft
    WHERE ft.bank_account_id = ba.id 
    AND NOT COALESCE(ft.is_void, false)
);
