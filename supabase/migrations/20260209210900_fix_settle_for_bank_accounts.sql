-- ============================================================
-- Fix: settle_commission_transaction deve aceitar bank_accounts
-- O usuário cadastra bancos na tabela bank_accounts (ex: Itaú)
-- mas a RPC tentava validar em financial_accounts
-- ============================================================

CREATE OR REPLACE FUNCTION public.settle_commission_transaction(
  p_transaction_id UUID,
  p_bank_account_id UUID,
  p_settlement_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_transaction RECORD;
  v_legacy_id UUID;
  v_new_transaction_id UUID;
  v_amount NUMERIC;
  v_pending_account_id UUID;
  v_bank_name TEXT;
BEGIN
  -- Obter user_id do contexto
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Resolução inteligente de ID
  SELECT id, status, amount, user_id INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND user_id = v_user_id;

  IF v_transaction.id IS NOT NULL THEN
    v_legacy_id := v_transaction.id;
  ELSE
    SELECT t.id, t.status, t.amount, t.user_id INTO v_transaction
    FROM financial_transactions ft
    JOIN transactions t ON t.id = ft.related_entity_id
    WHERE ft.id = p_transaction_id 
      AND ft.related_entity_type = 'legacy_transaction'
      AND t.user_id = v_user_id;
    
    IF v_transaction.id IS NOT NULL THEN
      v_legacy_id := v_transaction.id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Transação não encontrada');
    END IF;
  END IF;

  IF v_transaction.user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  IF v_transaction.status = 'PAGO' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transação já está paga');
  END IF;

  v_amount := v_transaction.amount;

  -- ============================================================
  -- CORREÇÃO: Validar banco em AMBAS as tabelas
  -- Primeiro tenta bank_accounts (novos bancos cadastrados pelo usuário)
  -- Se não encontrar, tenta financial_accounts (contas legadas)
  -- ============================================================
  
  -- Tentar encontrar em bank_accounts primeiro
  SELECT bank_name INTO v_bank_name
  FROM bank_accounts
  WHERE id = p_bank_account_id
    AND user_id = v_user_id
    AND is_active = true;
  
  -- Se não encontrou em bank_accounts, verificar financial_accounts
  IF v_bank_name IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM financial_accounts 
      WHERE id = p_bank_account_id 
        AND user_id = v_user_id 
        AND type = 'asset'
        AND status = 'active'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Conta bancária inválida. Verifique se o banco está cadastrado e ativo.');
    END IF;
  END IF;

  -- Buscar conta de comissões a receber
  SELECT id INTO v_pending_account_id
  FROM financial_accounts
  WHERE user_id = v_user_id 
    AND type = 'asset'
    AND name ILIKE '%comiss%receber%'
  LIMIT 1;

  IF v_pending_account_id IS NULL THEN
    SELECT id INTO v_pending_account_id
    FROM financial_accounts
    WHERE user_id = v_user_id AND type = 'asset' AND is_system = true
    LIMIT 1;
  END IF;

  IF v_pending_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta de comissões a receber não encontrada');
  END IF;

  -- 1. Atualizar status na tabela transactions (legado)
  UPDATE transactions
  SET status = 'PAGO',
      paid_date = p_settlement_date,
      updated_at = NOW()
  WHERE id = v_legacy_id;

  -- 2. Atualizar status das financial_transactions originais para 'completed'
  UPDATE financial_transactions
  SET status = 'completed'
  WHERE related_entity_id = v_legacy_id
    AND related_entity_type = 'legacy_transaction'
    AND status = 'pending'
    AND user_id = v_user_id;

  -- 3. Criar transação de baixa
  INSERT INTO financial_transactions (
    user_id,
    created_by,
    description,
    transaction_date,
    related_entity_type,
    related_entity_id,
    status
  ) VALUES (
    v_user_id,
    v_user_id,
    CASE 
      WHEN v_bank_name IS NOT NULL THEN 'Baixa de comissão - Recebimento em ' || v_bank_name
      ELSE 'Baixa de comissão - Recebimento'
    END,
    p_settlement_date,
    'commission_settlement',
    v_legacy_id,
    'confirmed'
  )
  RETURNING id INTO v_new_transaction_id;

  -- 4. Atualizar saldo do banco (se for da tabela bank_accounts)
  IF v_bank_name IS NOT NULL THEN
    UPDATE bank_accounts
    SET current_balance = current_balance + v_amount,
        updated_at = NOW()
    WHERE id = p_bank_account_id
      AND user_id = v_user_id;
  END IF;

  -- 5. Criar lançamentos contábeis (apenas se for financial_account legado)
  IF v_bank_name IS NULL THEN
    INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
    VALUES (v_new_transaction_id, p_bank_account_id, v_amount, 'Recebimento de comissão');
  END IF;

  INSERT INTO financial_ledger (transaction_id, account_id, amount, memo)
  VALUES (v_new_transaction_id, v_pending_account_id, -v_amount, 'Baixa de comissão a receber');

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_new_transaction_id,
    'legacy_id', v_legacy_id,
    'amount', v_amount,
    'bank_name', COALESCE(v_bank_name, 'Conta contábil'),
    'message', 'Comissão baixada com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.settle_commission_transaction(UUID, UUID, DATE) TO authenticated;
