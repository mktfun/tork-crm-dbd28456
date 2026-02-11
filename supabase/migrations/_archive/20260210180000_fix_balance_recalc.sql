-- =====================================================
-- FIX DEFINITIVO: Restauração de Saldos + Trigger Limpo
-- Corrige: ba.name→ba.bank_name, status filter, tipos exaustivos
-- =====================================================

-- 1. RESTAURAÇÃO DE SALDO: Recalcula baseado em TODAS as transações não-void
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

-- 2. TRIGGER DEFINITIVO: Sem filtro de status, tipos exaustivos
CREATE OR REPLACE FUNCTION public.update_bank_balance_immediately()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_impact NUMERIC;
    v_old_impact NUMERIC;
BEGIN
    -- === INSERT ===
    IF TG_OP = 'INSERT' THEN
        IF NEW.bank_account_id IS NOT NULL AND NOT COALESCE(NEW.is_void, false) THEN
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(NEW.total_amount, 0)) 
                WHEN NEW.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(NEW.total_amount, 0))
                ELSE 0 
            END;
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- === UPDATE ===
    IF TG_OP = 'UPDATE' THEN

        -- Caso 1: Transação foi anulada (is_void mudou para true)
        IF COALESCE(NEW.is_void, false) = true AND COALESCE(OLD.is_void, false) = false AND OLD.bank_account_id IS NOT NULL THEN
            v_old_impact := CASE 
                WHEN OLD.type IN ('revenue', 'receita', 'Entrada') THEN -ABS(COALESCE(OLD.total_amount, 0))
                WHEN OLD.type IN ('expense', 'despesa', 'Saída') THEN ABS(COALESCE(OLD.total_amount, 0))
                ELSE 0 
            END;
            IF v_old_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_old_impact WHERE id = OLD.bank_account_id;
            END IF;
            RETURN NEW;
        END IF;

        -- Caso 2: Banco vinculado agora (late binding: bank_account_id era NULL, virou UUID)
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

        -- Caso 3: Banco mudou de um para outro
        IF NEW.bank_account_id IS NOT NULL AND OLD.bank_account_id IS NOT NULL 
           AND NEW.bank_account_id <> OLD.bank_account_id AND NOT COALESCE(NEW.is_void, false) THEN
            -- Remove do banco antigo
            v_old_impact := CASE 
                WHEN OLD.type IN ('revenue', 'receita', 'Entrada') THEN -ABS(COALESCE(OLD.total_amount, 0))
                WHEN OLD.type IN ('expense', 'despesa', 'Saída') THEN ABS(COALESCE(OLD.total_amount, 0))
                ELSE 0 
            END;
            IF v_old_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_old_impact WHERE id = OLD.bank_account_id;
            END IF;
            -- Adiciona ao banco novo
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
$$;

-- 3. Recria trigger
DROP TRIGGER IF EXISTS trg_update_bank_balance_immediate ON financial_transactions;
CREATE TRIGGER trg_update_bank_balance_immediate
AFTER INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_immediately();

-- 4. Fix da RPC paginada: ba.name → ba.bank_name
CREATE OR REPLACE FUNCTION get_bank_statement_paginated(
    p_bank_account_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    bank_name TEXT,
    type TEXT,
    description TEXT,
    category_name TEXT,
    amount NUMERIC,
    running_balance NUMERIC,
    status_display TEXT,
    reconciled BOOLEAN,
    bank_account_id UUID,
    total_count BIGINT
) AS $$
DECLARE
    v_offset INTEGER;
    v_bank_uuid UUID;
    v_user_id UUID := auth.uid();
BEGIN
    v_offset := (p_page - 1) * p_page_size;
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    RETURN QUERY
    WITH all_movements AS (
        SELECT 
            t.id,
            t.transaction_date AS tx_date,
            COALESCE(ba.bank_name, 'Sem banco') AS bank_nm,
            t.type,
            t.description,
            COALESCE(
                (SELECT string_agg(fa.name, ', ') 
                 FROM financial_ledger fl 
                 JOIN financial_accounts fa ON fl.account_id = fa.id 
                 WHERE fl.transaction_id = t.id),
                'Sem categoria'
            ) AS cat_name,
            COALESCE(t.total_amount, 0) AS amount,
            CASE 
                WHEN t.type IN ('revenue', 'receita', 'Entrada') THEN COALESCE(t.total_amount, 0) 
                ELSE -COALESCE(t.total_amount, 0) 
            END AS impact,
            CASE 
                WHEN t.reconciled = TRUE THEN 'Conciliado'
                WHEN t.status = 'confirmed' THEN 'Pendente'
                ELSE t.status
            END AS status_disp,
            t.reconciled,
            t.bank_account_id AS tx_bank_account_id,
            t.created_at,
            COUNT(*) OVER() AS full_count
        FROM financial_transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.user_id = v_user_id
          AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND NOT COALESCE(t.is_void, false)
        ORDER BY t.transaction_date ASC, t.created_at ASC
    ),
    with_balance AS (
        SELECT *,
               SUM(impact) OVER (ORDER BY tx_date ASC, created_at ASC) AS running_bal
        FROM all_movements
    )
    SELECT 
        wb.id, wb.tx_date, wb.bank_nm, wb.type, wb.description, 
        wb.cat_name, wb.amount, wb.running_bal, wb.status_disp, 
        wb.reconciled, wb.tx_bank_account_id, wb.full_count
    FROM with_balance wb
    ORDER BY wb.tx_date DESC, wb.created_at DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
