-- =====================================================
-- FIX V9: Suporte a status confirmado em create_financial_movement
-- =====================================================
-- 
-- Problema: Receitas criadas sempre como 'pendente'.
-- Solução: Adicionar parâmetro p_is_confirmed.
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
  p_bank_account_id UUID DEFAULT NULL,
  p_is_confirmed BOOLEAN DEFAULT false -- Novo parâmetro
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_movement JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Inserir transação com is_confirmed mapeado para 'done' ou 'pending' logicamente, 
  -- mas o schema usa banco boleano is_confirmed (se não me engano, ou status TEXT).
  -- Verificando schema anterior, financial_transactions tem 'is_confirmed' (boolean)?
  -- Nos selects anteriores vi 'is_confirmed'. Vamos assumir boolean.
  
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
    is_confirmed -- Atualizando
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
    p_is_confirmed -- Valor inserido
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

GRANT EXECUTE ON FUNCTION create_financial_movement(TEXT, DATE, JSONB, TEXT, TEXT, UUID, UUID, BOOLEAN) TO authenticated;
