-- =====================================================
-- ATUALIZAR create_financial_movement PARA SUPORTAR BANCOS
-- =====================================================
-- 
-- Propósito: Adicionar parâmetro p_bank_account_id na função
--            create_financial_movement para vincular transações a bancos
--
-- Data: 2026-01-30
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_financial_movement(
  p_description TEXT,
  p_transaction_date DATE,
  p_movements JSONB, -- Array de {account_id: uuid, amount: numeric, memo?: text}
  p_reference_number TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL -- NOVO PARÂMETRO
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_user_id UUID;
  v_movement JSONB;
BEGIN
  -- Buscar usuário autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Criar transação
  INSERT INTO financial_transactions (
    user_id,
    description,
    transaction_date,
    reference_number,
    related_entity_type,
    related_entity_id,
    bank_account_id, -- NOVO CAMPO
    status
  ) VALUES (
    v_user_id,
    p_description,
    p_transaction_date,
    p_reference_number,
    p_related_entity_type,
    p_related_entity_id,
    p_bank_account_id, -- NOVO VALOR
    'confirmed'
  ) RETURNING id INTO v_transaction_id;

  -- Criar lançamentos no ledger
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
      (v_movement->>'amount')::NUMERIC,
      v_movement->>'memo'
    );
  END LOOP;

  RETURN v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.create_financial_movement IS 
'Cria uma transação financeira com múltiplos lançamentos no ledger.
Agora suporta vincular a transação a uma conta bancária via p_bank_account_id.';
