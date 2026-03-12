-- =====================================================================
-- ➕ FEATURE: Add Ramo, InsuranceCompany, Producer to Financial Transactions
-- Timestamp: 20260211140000
-- =====================================================================

-- 1. Add columns to financial_transactions (if not exists)
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS ramo_id UUID REFERENCES public.ramos(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS insurance_company_id UUID REFERENCES public.companies(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS producer_id UUID REFERENCES public.producers(id);

-- 2. Update create_financial_movement RPC (consolidated version + new params)
CREATE OR REPLACE FUNCTION public.create_financial_movement(
  p_description TEXT,
  p_transaction_date DATE,
  p_movements JSONB,
  p_reference_number TEXT DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_bank_account_id UUID DEFAULT NULL,
  p_is_confirmed BOOLEAN DEFAULT false,
  -- Novos parâmetros opcionais
  p_ramo_id UUID DEFAULT NULL,
  p_insurance_company_id UUID DEFAULT NULL,
  p_producer_id UUID DEFAULT NULL
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

  -- 1. Criar a transação COM novos campos
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

  -- 3. Atualizar saldo do banco SE confirmado e tiver banco
  -- (Agora redundante pois o trigger cuida disso, mas mantido por segurança/compatibilidade se o trigger falhar ou for removido)
  -- NOTA: Como ativamos o trigger `update_bank_balance_immediately`, podemos remover isso, mas 
  -- vamos deixar comentado ou remover para evitar update duplo se o trigger não tiver verificação de old/new.
  -- O trigger novo tem proteção de idempotência simples, mas dois updates na mesma tx é desperdício.
  -- VAMOS REMOVER O UPDATE MANUAL AQUI e confiar no TRIGGER que acabamos de corrigir.
  
  -- (Removido bloco de update manual de saldo)

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
