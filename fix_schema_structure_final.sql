-- =====================================================
-- FIX ESTRUTURAL FINAL (Schema + Trigger + RPC Híbrida)
-- =====================================================

-- 1. Garante que a coluna de tipo existe
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS type TEXT;

-- 2. Alimenta a nova coluna com base no ledger (Backfill Seguro)
UPDATE financial_transactions ft
SET type = sub.t_type
FROM (
    SELECT l.transaction_id, 
           CASE 
             WHEN EXISTS (SELECT 1 FROM financial_ledger l2 JOIN financial_accounts a2 ON l2.account_id = a2.id WHERE l2.transaction_id = l.transaction_id AND a2.type = 'revenue') THEN 'revenue'
             ELSE 'expense' 
           END as t_type
    FROM financial_ledger l
    GROUP BY l.transaction_id
) AS sub
WHERE ft.id = sub.transaction_id AND ft.type IS NULL;

-- 3. Trigger de Saldo BLINDADO (Cópia da Lógica do Usuário)
CREATE OR REPLACE FUNCTION update_bank_balance_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_impact NUMERIC;
BEGIN
    -- Só age se a transação for marcada como conciliada AGORA
    IF NEW.reconciled = TRUE AND (OLD.reconciled = FALSE OR OLD.reconciled IS NULL) THEN
        -- Calcula o impacto real olhando o LEDGER
        -- Receitas (Credit) -> Aumentam saldo
        -- Despesas (Debit) -> Diminuem saldo
        SELECT SUM(CASE WHEN a.type = 'revenue' THEN ABS(l.amount) ELSE -ABS(l.amount) END)
        INTO v_impact
        FROM financial_ledger l
        JOIN financial_accounts a ON l.account_id = a.id
        WHERE l.transaction_id = NEW.id
          AND a.type IN ('revenue', 'expense');

        -- Se houver banco vinculado, atualiza o saldo
        IF NEW.bank_account_id IS NOT NULL AND v_impact IS NOT NULL THEN
            UPDATE bank_accounts 
            SET current_balance = current_balance + v_impact
            WHERE id = NEW.bank_account_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RPC create_financial_movement (Mantendo assinatura do Frontend mas preenchendo Type)
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
  v_determined_type TEXT := 'expense'; -- Default para expense
BEGIN
  v_user_id := auth.uid();
  
  -- 1. Criar a transação (inicialmente sem type definitivo ou inferido)
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
    status
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
    
    -- Calcula impacto no saldo bancário (se não balanceado)
    v_bank_transaction_amount := v_bank_transaction_amount - (v_movement->>'amount')::DECIMAL;
  END LOOP;

  -- 3. Infeir e Atualizar o TYPE da transação baseado no Ledger inserido
  UPDATE financial_transactions ft
  SET type = (
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM financial_ledger l JOIN financial_accounts a ON l.account_id = a.id WHERE l.transaction_id = ft.id AND a.type = 'revenue') THEN 'revenue'
        ELSE 'expense' 
    END
  )
  WHERE id = v_transaction_id
  RETURNING type INTO v_determined_type;

  -- 4. Atualizar saldo do banco (bank_accounts) SE confirmado e tiver banco
  IF p_bank_account_id IS NOT NULL AND p_is_confirmed THEN
    IF EXISTS (SELECT 1 FROM bank_accounts WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
      UPDATE bank_accounts
      SET current_balance = current_balance + v_bank_transaction_amount,
          updated_at = NOW()
      WHERE id = p_bank_account_id;
    ELSE
      RAISE EXCEPTION 'Conta bancária não encontrada (ID: %) ou não pertence ao usuário.', p_bank_account_id;
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
