-- =====================================================
-- FIX IMUTABILIDADE REAL + TOTAL AMOUNT
-- (Substitui a função correta: prevent_transaction_modification)
-- =====================================================

-- 1. Relaxar o trigger de imutabilidade EXISTENTE
CREATE OR REPLACE FUNCTION public.prevent_transaction_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Operação proibida: Transações financeiras não podem ser deletadas.';
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Permitir atualização de campos de reconciliação e controle interno
    IF (OLD.reconciled IS DISTINCT FROM NEW.reconciled) OR
       (OLD.statement_id IS DISTINCT FROM NEW.statement_id) OR
       (OLD.total_amount IS DISTINCT FROM NEW.total_amount) OR
       (OLD.bank_account_id IS DISTINCT FROM NEW.bank_account_id) THEN
       RETURN NEW;
    END IF;

    -- Permite atualizar status (correções de fluxo)
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        RETURN NEW;
    END IF;

    -- Permite anulação (void)
    IF NEW.is_void IS DISTINCT FROM OLD.is_void THEN
        RETURN NEW;
    END IF;

    -- Bloqueia alteração de dados fiscais em transações concluídas
    IF OLD.status IN ('confirmed', 'completed') THEN
       IF (OLD.description IS DISTINCT FROM NEW.description) OR
          (OLD.transaction_date IS DISTINCT FROM NEW.transaction_date) THEN
            RAISE EXCEPTION 'Operação proibida: Transações concluídas são imutáveis. Apenas estorno ou conciliação permitido.';
       END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Garantir coluna total_amount
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

-- 3. Popular total_amount para transações zeradas (backfill)
-- Agora o trigger vai PERMITIR esse update porque total_amount está na lista de exceções
UPDATE financial_transactions ft
SET total_amount = (
    SELECT COALESCE(SUM(ABS(fl.amount)), 0)
    FROM financial_ledger fl 
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE fl.transaction_id = ft.id 
    AND fa.type IN ('revenue', 'expense')
)
WHERE ft.total_amount IS NULL OR ft.total_amount = 0;

-- 4. RPC de criação corrigida (create_financial_movement)
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
BEGIN
    INSERT INTO financial_transactions (
        description, 
        total_amount, 
        status, 
        transaction_date, 
        bank_account_id, 
        reconciled
    ) VALUES (
        p_description, 
        ABS(p_amount), 
        'confirmed', 
        p_transaction_date, 
        p_bank_account_id, 
        false
    ) RETURNING id INTO v_transaction_id;

    INSERT INTO financial_ledger (transaction_id, account_id, amount)
    VALUES (
        v_transaction_id, 
        p_account_id, 
        CASE WHEN p_type = 'revenue' THEN -ABS(p_amount) ELSE ABS(p_amount) END
    );

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
