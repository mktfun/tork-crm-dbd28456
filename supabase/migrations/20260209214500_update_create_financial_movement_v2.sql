-- ============================================================
-- ATUALIZAÇÃO CRÍTICA: Unificação de Bancos
-- Permite que create_financial_movement atualize bank_accounts diretamente
-- e suporte ledgers desbalanceados (quando um lado é bank_accounts)
-- ============================================================

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
  v_is_revenue BOOLEAN := false;
  v_is_expense BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  
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
    status -- Mantendo compatibilidade com campo status texto
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
    CASE WHEN p_is_confirmed THEN 'confirmed' ELSE 'pending' END
  ) RETURNING id INTO v_transaction_id;

  -- 2. Inserir movimentos no ledger (financial_accounts)
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

    -- Calcular impacto no banco (somar valores inversos das contas de resultado)
    -- Se for DESPESA (Expense Account > 0), no banco sai dinheiro (negativo)
    -- Se for RECEITA (Revenue Account < 0), no banco entra dinheiro (positivo)
    -- O 'amount' no ledger para Expense é Positivo (Débito) e Revenue é Negativo (Crédito)
    -- Porém a lógica de partidas dobradas inverte.
    
    -- Simplificação: Vamos confiar no valor passado pelo frontend para a conta de Ativo/Banco.
    -- O frontend calcula o valor da transação com base no input.
    -- Mas aqui no loop só temos as contas de financial_accounts.
    
    -- Vamos detectar se é uma receita ou despesa baseada no tipo da conta no ledger? 
    -- Não, melhor usar a soma dos movements para inferir o valor da transação se o banco não estiver nos movements.
    
    -- Se o ledger estiver desbalanceado (soma != 0), a diferença deve ser o banco.
    v_bank_transaction_amount := v_bank_transaction_amount - (v_movement->>'amount')::DECIMAL;
  END LOOP;

  -- 3. Atualizar saldo do banco (bank_accounts) SE confirmado e tiver banco
  IF p_bank_account_id IS NOT NULL AND p_is_confirmed THEN
    -- Verificar se conta existe e é do usuário
    IF EXISTS (SELECT 1 FROM bank_accounts WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
      
      -- Se v_bank_transaction_amount for 0 (ledger balanceado), algo está errado se queríamos usar banco.
      -- Mas mudamos o frontend para NÃO mandar a perna do ativo.
      -- Então v_bank_transaction_amount terá o valor exato que falta para balancear (o valor do banco).
      
      -- Exemplo Receita R$ 100:
      -- Ledger: Revenue Account = -100
      -- v_bank_transaction_amount inicial = 0
      -- Loop: 0 - (-100) = +100
      -- Resultado: +100 para o banco. Correto.

      -- Exemplo Despesa R$ 50:
      -- Ledger: Expense Account = +50
      -- v_bank_transaction_amount inicial = 0
      -- Loop: 0 - (+50) = -50
      -- Resultado: -50 para o banco. Correto.

      UPDATE bank_accounts
      SET current_balance = current_balance + v_bank_transaction_amount,
          updated_at = NOW()
      WHERE id = p_bank_account_id;
      
      -- Opcional: Registrar histórico na tabela de transações do banco?
      -- Atualmente financial_transactions + bank_account_id já serve como histórico.
      
    ELSE
      RAISE EXCEPTION 'Conta bancária não encontrada ou não pertence ao usuário.';
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_financial_movement(TEXT, DATE, JSONB, TEXT, TEXT, UUID, UUID, BOOLEAN) TO authenticated;
