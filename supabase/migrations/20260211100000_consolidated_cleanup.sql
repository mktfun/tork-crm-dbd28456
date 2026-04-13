-- =====================================================================
-- 🧹 MIGRATION CONSOLIDADA — FAXINA DEFINITIVA
-- Timestamp: 20260211100000
-- Objetivo: Eliminar overloads, triggers fantasma e inconsistências.
--           Garantir estado final determinístico.
-- =====================================================================
-- INSTRUÇÕES: Rodar ESTE arquivo no Supabase SQL Editor.
--             Ele é IDEMPOTENTE — pode ser rodado quantas vezes quiser.
-- =====================================================================

BEGIN;

-- =============================================================
-- PARTE 0: LIMPEZA DE ENTULHO
-- =============================================================

-- 0.1. DROP da overload fantasma de 6 params (criada no sanity_reset)
DROP FUNCTION IF EXISTS public.create_financial_movement(TEXT, NUMERIC, UUID, UUID, DATE, TEXT);

-- 0.2. DROP de triggers abandonados (estratégia "por reconciliação" morta)
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconcile ON financial_transactions;
DROP TRIGGER IF EXISTS trg_update_bank_balance_on_reconciliation ON financial_transactions;
DROP TRIGGER IF EXISTS trg_update_bank_balance_reconciled ON financial_transactions;

-- 0.3. DROP de função de reconciliação abandonada
DROP FUNCTION IF EXISTS update_bank_balance_on_reconciliation() CASCADE;

-- 0.4. DROP do trigger imediato (vai ser recriado logo abaixo)
DROP TRIGGER IF EXISTS trg_update_bank_balance_immediate ON financial_transactions;


-- =============================================================
-- PARTE 1: Colunas obrigatórias (idempotente)
-- =============================================================

ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reconciliation_method TEXT DEFAULT 'manual';
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS is_void BOOLEAN DEFAULT false;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- Adiciona coluna de saldo inicial na tabela de contas bancárias
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS initial_balance NUMERIC DEFAULT 0;


-- =============================================================
-- PARTE 2: create_financial_movement (8 params — versão DEFINITIVA)
-- Frontend chama com: p_description, p_transaction_date, p_movements,
-- p_reference_number, p_related_entity_type, p_related_entity_id,
-- p_bank_account_id, p_is_confirmed
-- =============================================================

CREATE OR REPLACE FUNCTION public.create_financial_movement(
  p_description TEXT,
  p_transaction_date DATE,
  p_movements JSONB,
  p_reference_number TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL,
  p_is_confirmed BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_movement JSONB;
  v_user_id UUID;
  v_bank_transaction_amount NUMERIC := 0;
  v_total_amount NUMERIC := 0;
  v_transaction_type TEXT := 'expense';
BEGIN
  v_user_id := auth.uid();
  
  -- Calcula total_amount e tipo a partir dos movements
  -- O impacto no banco = inverso da soma dos lançamentos contábeis
  -- Receita: conta revenue tem amount negativo → banco = -(-X) = +X
  -- Despesa: conta expense tem amount positivo → banco = -(+X) = -X  
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    v_bank_transaction_amount := v_bank_transaction_amount - (v_movement->>'amount')::DECIMAL;
  END LOOP;
  
  v_total_amount := ABS(v_bank_transaction_amount);
  
  IF v_bank_transaction_amount > 0 THEN
    v_transaction_type := 'revenue';
  ELSE
    v_transaction_type := 'expense';
  END IF;

  -- 1. Criar a transação COM total_amount e type
  INSERT INTO financial_transactions (
    user_id,
    created_by,
    description,
    transaction_date,
    reference_number,
    related_entity_type,
    related_entity_id,
    bank_account_id,
    is_void,
    is_confirmed,
    status,
    total_amount,
    type
  ) VALUES (
    v_user_id,
    v_user_id,
    p_description,
    p_transaction_date,
    p_reference_number,
    p_related_entity_type,
    p_related_entity_id,
    p_bank_account_id,
    false,
    p_is_confirmed,
    CASE WHEN p_is_confirmed THEN 'confirmed' ELSE 'pending' END,
    v_total_amount,
    v_transaction_type
  ) RETURNING id INTO v_transaction_id;

  -- 2. Inserir movimentos no ledger
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    INSERT INTO financial_ledger (
      transaction_id,
      account_id,
      amount,
      memo
    ) VALUES (
      v_transaction_id,
      (v_movement->>'account_id')::UUID,
      (v_movement->>'amount')::DECIMAL,
      COALESCE(v_movement->>'memo', p_description)
    );
  END LOOP;

  -- 3. Atualizar saldo do banco SE confirmado e tiver banco
  IF p_bank_account_id IS NOT NULL AND p_is_confirmed THEN
    IF EXISTS (SELECT 1 FROM bank_accounts WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
      UPDATE bank_accounts
      SET current_balance = current_balance + v_bank_transaction_amount,
          updated_at = NOW()
      WHERE id = p_bank_account_id;
    ELSE
      RAISE EXCEPTION 'Conta bancária não encontrada ou não pertence ao usuário.';
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_financial_movement(TEXT, DATE, JSONB, TEXT, TEXT, UUID, UUID, BOOLEAN) TO authenticated;


-- =============================================================
-- PARTE 3: get_bank_statement_detailed (DEFINITIVA — retorna transaction_date)
-- =============================================================

DROP FUNCTION IF EXISTS public.get_bank_statement_detailed(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_bank_statement_detailed(
    p_bank_account_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    document_number TEXT,
    description TEXT,
    category_name TEXT,
    revenue_amount NUMERIC,
    expense_amount NUMERIC,
    running_balance NUMERIC,
    status TEXT,
    reconciled BOOLEAN,
    method TEXT,
    bank_account_id UUID
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    WITH movements AS (
        SELECT 
            t.id,
            t.transaction_date AS tx_date,
            t.document_number,
            t.description,
            COALESCE(
                (SELECT string_agg(fa.name, ', ') 
                 FROM financial_ledger fl 
                 JOIN financial_accounts fa ON fl.account_id = fa.id 
                 WHERE fl.transaction_id = t.id),
                'Sem categoria'
            ) AS cat_name,
            CASE WHEN t.type IN ('revenue', 'receita') THEN COALESCE(t.total_amount, 0) ELSE 0 END AS rev,
            CASE WHEN t.type IN ('expense', 'despesa') THEN COALESCE(t.total_amount, 0) ELSE 0 END AS exp,
            CASE WHEN t.type IN ('revenue', 'receita') THEN COALESCE(t.total_amount, 0) 
                 ELSE -COALESCE(t.total_amount, 0) END AS impact,
            CASE WHEN t.reconciled = TRUE THEN 'Conciliado' ELSE 'Pendente' END AS status_disp,
            t.reconciled,
            t.reconciliation_method,
            t.created_at,
            t.bank_account_id AS tx_bank_account_id
        FROM financial_transactions t
        WHERE t.user_id = v_user_id
          AND (p_bank_account_id IS NULL OR t.bank_account_id = p_bank_account_id::uuid)
          AND NOT COALESCE(t.is_void, false)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
        ORDER BY t.transaction_date ASC, t.created_at ASC
    )
    SELECT 
        m.id, m.tx_date, m.document_number, m.description, m.cat_name,
        m.rev, m.exp,
        SUM(m.impact) OVER (ORDER BY m.tx_date ASC, m.created_at ASC) AS running_balance,
        m.status_disp, m.reconciled, m.reconciliation_method, m.tx_bank_account_id
    FROM movements m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================
-- PARTE 4: get_bank_statement_paginated (DEFINITIVA)
-- =============================================================

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
                ELSE COALESCE(t.status, 'Pendente')
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


-- =============================================================
-- PARTE 5: manual_reconcile_transaction (com late binding)
-- =============================================================

DROP FUNCTION IF EXISTS public.manual_reconcile_transaction(uuid);
DROP FUNCTION IF EXISTS public.manual_reconcile_transaction(uuid, uuid);

CREATE OR REPLACE FUNCTION public.manual_reconcile_transaction(
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
    -- Update atômico: vincula banco (se fornecido) e concilia
    UPDATE financial_transactions 
    SET 
        bank_account_id = COALESCE(p_bank_account_id, bank_account_id),
        reconciled = TRUE,
        reconciled_at = NOW(),
        reconciliation_method = 'manual'
    WHERE id = p_transaction_id
      AND user_id = v_user_id
      AND NOT COALESCE(is_void, false);

    -- Validação: precisa ter banco vinculado
    IF NOT EXISTS (
        SELECT 1 FROM financial_transactions 
        WHERE id = p_transaction_id 
          AND user_id = v_user_id
          AND bank_account_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Erro: A transação precisa de uma conta bancária para ser conciliada.';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_reconcile_transaction(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_reconcile_transaction(uuid, uuid) TO service_role;


-- =============================================================
-- PARTE 6: unreconcile_transaction
-- =============================================================

CREATE OR REPLACE FUNCTION unreconcile_transaction(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    UPDATE financial_transactions 
    SET reconciled = FALSE, 
        reconciled_at = NULL, 
        reconciliation_method = NULL
    WHERE id = p_transaction_id 
      AND user_id = v_user_id
      AND NOT COALESCE(is_void, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unreconcile_transaction(UUID) TO authenticated;


-- =============================================================
-- PARTE 7: Trigger de Saldo Imediato (DEFINITIVO)
-- Estratégia: saldo atualiza no INSERT e em qualquer UPDATE relevante
-- =============================================================

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

        -- Caso 2: Banco vinculado agora (late binding: NULL → UUID)
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

-- Instala o trigger (único ativo)
CREATE TRIGGER trg_update_bank_balance_immediate
AFTER INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_immediately();


-- =============================================================
-- PARTE 8: BACKFILL — Corrige transações com total_amount = 0
-- Calcula a partir do ledger contábil
-- =============================================================

UPDATE financial_transactions ft
SET total_amount = sub.calc_amount,
    type = COALESCE(ft.type, sub.calc_type)
FROM (
    SELECT 
        fl.transaction_id,
        -- Para ledger com 1 entrada: usar o valor absoluto
        -- Para ledger com 2 entradas (partidas dobradas): usar o maior valor absoluto
        MAX(ABS(fl.amount)) AS calc_amount,
        CASE 
            WHEN SUM(CASE WHEN fa.type = 'revenue' THEN 1 ELSE 0 END) > 0 THEN 'revenue'
            ELSE 'expense'
        END AS calc_type
    FROM financial_ledger fl
    JOIN financial_accounts fa ON fa.id = fl.account_id
    GROUP BY fl.transaction_id
) sub
WHERE ft.id = sub.transaction_id
AND (ft.total_amount IS NULL OR ft.total_amount = 0);


-- =============================================================
-- PARTE 9: RECÁLCULO DEFINITIVO DE SALDOS
-- Fonte da verdade: todas as transações não-void com banco
-- =============================================================

UPDATE bank_accounts ba
SET current_balance = COALESCE(ba.initial_balance, 0) + (
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

COMMIT;

-- =====================================================================
-- FIM. Estado é agora determinístico e verificável.
-- =====================================================================
