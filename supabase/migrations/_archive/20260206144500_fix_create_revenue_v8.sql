-- =====================================================
-- FIX V8: Corrigir constraint created_by em create_financial_movement
-- =====================================================
-- 
-- Problema: V7 falhou com erro "null value in column created_by violates not-null constraint".
-- Solução: Inserir created_by (igual ao user_id/auth.uid()).
--
-- Data: 2026-02-06
-- =====================================================

CREATE OR REPLACE FUNCTION create_financial_movement(
  p_description TEXT,
  p_transaction_date DATE,
  p_movements JSONB,
  p_reference_number TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_movement JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Inserir transação com bank_account_id e created_by
  INSERT INTO financial_transactions (
    user_id,
    created_by, -- Campo obrigatório
    description,
    transaction_date,
    reference_number,
    related_entity_type,
    related_entity_id,
    bank_account_id,
    is_void
  ) VALUES (
    v_user_id,
    v_user_id, -- Preencher com usuário atual
    p_description,
    p_transaction_date,
    p_reference_number,
    p_related_entity_type,
    p_related_entity_id,
    p_bank_account_id,
    false
  ) RETURNING id INTO v_transaction_id;

  -- Inserir movimentos no ledger
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
      v_movement->>'memo'
    );
  END LOOP;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_financial_movement(TEXT, DATE, JSONB, TEXT, TEXT, UUID, UUID) TO authenticated;
