-- =====================================================================
-- FIX CRÍTICO: create_financial_movement - tipo errado para receitas
-- Problema: lançamentos balanceados (double-entry) fazem a soma dos
--           movements resultar em 0, forçando type = 'expense' mesmo
--           para receitas. Adicionamos p_type explícito como solução.
-- Timestamp: 20260507160000
-- =====================================================================

-- Substituir a versão atual com suporte ao p_type explícito
CREATE OR REPLACE FUNCTION public.create_financial_movement(
  p_description TEXT,
  p_transaction_date DATE,
  p_movements JSONB,
  p_reference_number TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL,
  p_is_confirmed BOOLEAN DEFAULT false,
  p_ramo_id UUID DEFAULT NULL,
  p_insurance_company_id UUID DEFAULT NULL,
  p_producer_id UUID DEFAULT NULL,
  -- Novo parâmetro opcional: tipo explícito ('revenue' ou 'expense')
  -- Se fornecido, sobrescreve a inferência automática pelos movements.
  p_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_movement JSONB;
  v_user_id UUID;
  v_bank_transaction_amount NUMERIC := 0;
  v_total_amount NUMERIC := 0;
  v_transaction_type TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Calcula total_amount a partir dos movements (soma dos valores absolutos / 2
  -- para double-entry, ou soma dos positivos para single-leg)
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    v_bank_transaction_amount := v_bank_transaction_amount + (v_movement->>'amount')::DECIMAL;
  END LOOP;

  v_total_amount := ABS(v_bank_transaction_amount);

  -- Se total_amount for 0 (lançamentos balanceados/double-entry),
  -- calculamos pelo ABS de todos os valores e dividimos por 2
  IF v_total_amount = 0 THEN
    v_total_amount := 0;
    FOR v_movement IN SELECT * FROM jsonb_array_elements(p_movements)
    LOOP
      v_total_amount := v_total_amount + ABS((v_movement->>'amount')::DECIMAL);
    END LOOP;
    v_total_amount := v_total_amount / 2;
  END IF;

  -- Determinar o tipo:
  -- 1. Prioridade: p_type explícito (passado pelo caller)
  -- 2. Fallback: inferência pelo sinal da soma dos movements
  IF p_type IS NOT NULL AND p_type IN ('revenue', 'expense') THEN
    v_transaction_type := p_type;
  ELSIF v_bank_transaction_amount > 0 THEN
    v_transaction_type := 'revenue';
  ELSE
    v_transaction_type := 'expense';
  END IF;

  -- 1. Criar a transação
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
    type,
    ramo_id,
    insurance_company_id,
    producer_id
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
    v_transaction_type,
    p_ramo_id,
    p_insurance_company_id,
    p_producer_id
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

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manter permissões existentes
GRANT EXECUTE ON FUNCTION create_financial_movement(TEXT, DATE, JSONB, TEXT, TEXT, UUID, UUID, BOOLEAN, UUID, UUID, UUID, TEXT) TO authenticated;

-- =====================================================================
-- FIX RETROATIVO: corrigir transações manuais existentes que foram
-- erroneamente classificadas como 'expense' sendo receitas.
-- Identifica pelo tipo da conta no ledger (revenue account → revenue)
-- =====================================================================
UPDATE financial_transactions ft
SET type = 'revenue'
WHERE ft.type = 'expense'
  AND ft.related_entity_type IS NULL  -- somente lançamentos manuais
  AND NOT COALESCE(ft.is_void, false)
  AND EXISTS (
    SELECT 1
    FROM financial_ledger fl
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE fl.transaction_id = ft.id
      AND fa.type = 'revenue'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM financial_ledger fl
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE fl.transaction_id = ft.id
      AND fa.type = 'expense'
  );

-- Log do resultado
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Fix retroativo: % transações manuais corrigidas de expense → revenue', v_count;
END $$;
