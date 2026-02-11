-- =====================================================
-- FIX CRÍTICO: create_financial_movement NÃO grava total_amount
-- A RPC existente (8 params) insere na tabela sem setar total_amount,
-- então fica DEFAULT 0 → tudo aparece como R$ 0,00
-- =====================================================

-- 1. DROP da assinatura errada que foi criada no sanity_reset (6 params)
-- Para evitar conflito de overloads
DROP FUNCTION IF EXISTS public.create_financial_movement(TEXT, NUMERIC, UUID, UUID, DATE, TEXT);

-- 2. Recria a RPC OFICIAL com total_amount calculado dos movements
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
  v_transaction_type TEXT := 'expense'; -- default
BEGIN
  v_user_id := auth.uid();
  
  -- Calcula total_amount e tipo a partir dos movements
  -- Receita: a conta revenue tem amount negativo (crédito)
  -- Despesa: a conta expense tem amount positivo (débito)
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    v_bank_transaction_amount := v_bank_transaction_amount - (v_movement->>'amount')::DECIMAL;
  END LOOP;
  
  -- O valor absoluto do banco é o total_amount
  v_total_amount := ABS(v_bank_transaction_amount);
  
  -- Se o banco recebe (positivo), é receita. Se sai (negativo), é despesa.
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

-- 4. Backfill: Atualiza total_amount de transações existentes que estão com 0
UPDATE financial_transactions ft
SET total_amount = sub.calc_amount,
    type = sub.calc_type
FROM (
    SELECT 
        fl.transaction_id,
        SUM(ABS(fl.amount)) / 2 AS calc_amount, -- partidas dobradas: soma/2
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

-- 5. Recalcula saldos de todos os bancos
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
    AND COALESCE(ft.status, 'pending') IN ('confirmed', 'completed')
);
