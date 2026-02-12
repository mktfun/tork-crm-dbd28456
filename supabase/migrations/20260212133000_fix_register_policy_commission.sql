-- =====================================================
-- FIX REGISTER POLICY COMMISSION RPC
-- =====================================================

-- Objetivo: Permitir que a data da transação (vencimento) e o status sejam passados como parâmetro.
-- Isso resolve o problema das comissões "vencerem" no dia da emissão.
-- Agora o frontend pode passar "Data Emissão + 30 dias".

DROP FUNCTION IF EXISTS public.register_policy_commission(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.register_policy_commission(UUID, TEXT, TEXT, TEXT, NUMERIC, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.register_policy_commission(
  p_policy_id UUID,
  p_client_name TEXT,
  p_ramo_name TEXT,
  p_policy_number TEXT,
  p_commission_amount NUMERIC,
  p_company_name TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE,
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_transaction_id UUID;
  v_receivable_account_id UUID;
  v_revenue_account_id UUID;
  v_reference_number TEXT;
  v_clean_client_name TEXT;
  v_clean_ramo_name TEXT;
  v_clean_policy_number TEXT;
  v_clean_company_name TEXT;
  v_description TEXT;
  v_is_confirmed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Limpar nomes (nunca undefined)
  v_clean_client_name := COALESCE(NULLIF(TRIM(p_client_name), ''), 'Cliente não informado');
  v_clean_ramo_name := COALESCE(NULLIF(TRIM(p_ramo_name), ''), 'Ramo não informado');
  v_clean_policy_number := COALESCE(NULLIF(TRIM(p_policy_number), ''), 'S/N');
  v_clean_company_name := COALESCE(NULLIF(TRIM(p_company_name), ''), '');

  -- Verificar se já existe transação para esta apólice
  SELECT ft.id INTO v_transaction_id
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND ft.related_entity_type = 'policy'
    AND ft.related_entity_id = p_policy_id::TEXT
    AND NOT COALESCE(ft.is_void, false)
  LIMIT 1;

  IF v_transaction_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Comissão já registrada para esta apólice',
      'existing_transaction_id', v_transaction_id
    );
  END IF;

  -- Buscar ou criar conta "Comissões a Receber" (Ativo)
  SELECT id INTO v_receivable_account_id
  FROM financial_accounts
  WHERE user_id = v_user_id
    AND name = 'Comissões a Receber'
    AND type = 'asset'
    AND status = 'active'
  LIMIT 1;

  IF v_receivable_account_id IS NULL THEN
    INSERT INTO financial_accounts (user_id, name, type, code, description, status)
    VALUES (v_user_id, 'Comissões a Receber', 'asset', '1.1.3', 'Comissões pendentes de recebimento', 'active')
    RETURNING id INTO v_receivable_account_id;
  END IF;

  -- Buscar ou criar conta "Receita de Comissões" (Receita)
  SELECT id INTO v_revenue_account_id
  FROM financial_accounts
  WHERE user_id = v_user_id
    AND name = 'Receita de Comissões'
    AND type = 'revenue'
    AND status = 'active'
  LIMIT 1;

  IF v_revenue_account_id IS NULL THEN
    INSERT INTO financial_accounts (user_id, name, type, code, description, status)
    VALUES (v_user_id, 'Receita de Comissões', 'revenue', '4.1.1', 'Receitas de comissões de apólices', 'active')
    RETURNING id INTO v_revenue_account_id;
  END IF;

  -- Gerar reference_number único
  v_reference_number := 'COM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Montar descrição limpa
  IF v_clean_company_name != '' THEN
    v_description := v_clean_client_name || ' (' || v_clean_ramo_name || ') - ' || v_clean_company_name;
  ELSE
    v_description := v_clean_client_name || ' (' || v_clean_ramo_name || ')';
  END IF;

  -- Determinar is_confirmed
  v_is_confirmed := (p_status IN ('confirmed', 'completed', 'settled'));

  -- Criar transação
  INSERT INTO financial_transactions (
    user_id,
    created_by,
    description,
    transaction_date,
    reference_number,
    related_entity_type,
    related_entity_id,
    status,
    is_confirmed,
    is_void,
    total_amount,
    type
  ) VALUES (
    v_user_id,
    v_user_id,
    v_description,
    p_transaction_date, -- DATA CORRETA (VENCIMENTO)
    v_reference_number,
    'policy',
    p_policy_id::TEXT,
    p_status,
    v_is_confirmed,
    false,
    p_commission_amount,
    'revenue'
  )
  RETURNING id INTO v_transaction_id;

  -- Lançamento 1: DÉBITO em Comissões a Receber (Ativo aumenta)
  INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
  VALUES (v_transaction_id, v_receivable_account_id, p_commission_amount, 'Comissão a receber - ' || v_clean_client_name);

  -- Lançamento 2: CRÉDITO em Receita de Comissões (Receita aumenta)
  INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
  VALUES (v_transaction_id, v_revenue_account_id, -p_commission_amount, 'Receita de comissão - ' || v_clean_client_name);

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'reference_number', v_reference_number,
    'amount', p_commission_amount,
    'description', v_description
  );
END;
$$;
