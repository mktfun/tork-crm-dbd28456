-- =====================================================
-- ADICIONAR SUPORTE A BANCOS EM TRANSAÇÕES
-- =====================================================
-- 
-- Propósito: Permitir vincular transações a contas bancárias
--            e dividir valores entre múltiplos bancos
--
-- Data: 2026-01-30
-- =====================================================

-- 1. Adicionar coluna bank_account_id em financial_transactions
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_ft_bank_account ON financial_transactions(bank_account_id);

-- Comentário
COMMENT ON COLUMN financial_transactions.bank_account_id IS 
'Conta bancária vinculada à transação. NULL = transação sem banco (legada)';

-- 2. Criar tabela para distribuição de valores entre múltiplos bancos
CREATE TABLE IF NOT EXISTS transaction_bank_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  percentage DECIMAL(5, 2) CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(transaction_id, bank_account_id)
);

CREATE INDEX IF NOT EXISTS idx_tbd_transaction ON transaction_bank_distribution(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tbd_bank_account ON transaction_bank_distribution(bank_account_id);

ALTER TABLE transaction_bank_distribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaction distributions"
  ON transaction_bank_distribution
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM financial_transactions ft
      WHERE ft.id = transaction_bank_distribution.transaction_id
      AND ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transaction distributions"
  ON transaction_bank_distribution
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_transactions ft
      WHERE ft.id = transaction_bank_distribution.transaction_id
      AND ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transaction distributions"
  ON transaction_bank_distribution
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM financial_transactions ft
      WHERE ft.id = transaction_bank_distribution.transaction_id
      AND ft.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction distributions"
  ON transaction_bank_distribution
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM financial_transactions ft
      WHERE ft.id = transaction_bank_distribution.transaction_id
      AND ft.user_id = auth.uid()
    )
  );

COMMENT ON TABLE transaction_bank_distribution IS 
'Permite dividir uma transação entre múltiplos bancos.
Exemplo: Receita de R$ 10.000 → R$ 6.000 no Itaú + R$ 4.000 no Bradesco';

-- 3. Função para calcular saldo de um banco
CREATE OR REPLACE FUNCTION get_bank_balance(
  p_bank_account_id UUID,
  p_include_pending BOOLEAN DEFAULT false
)
RETURNS DECIMAL AS $$
DECLARE
  v_initial_balance DECIMAL;
  v_transactions_balance DECIMAL;
  v_distributed_balance DECIMAL;
BEGIN
  -- Buscar saldo inicial
  SELECT current_balance INTO v_initial_balance
  FROM bank_accounts
  WHERE id = p_bank_account_id;
  
  IF v_initial_balance IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular saldo de transações diretas (bank_account_id)
  SELECT COALESCE(SUM(
    CASE 
      WHEN fa.type = 'income' THEN fl.amount
      WHEN fa.type = 'expense' THEN -fl.amount
      ELSE 0
    END
  ), 0) INTO v_transactions_balance
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.bank_account_id = p_bank_account_id
    AND NOT ft.is_void
    AND (p_include_pending OR ft.status = 'confirmed');
  
  -- Calcular saldo de transações distribuídas
  SELECT COALESCE(SUM(
    CASE 
      WHEN fa.type = 'income' THEN tbd.amount
      WHEN fa.type = 'expense' THEN -tbd.amount
      ELSE 0
    END
  ), 0) INTO v_distributed_balance
  FROM transaction_bank_distribution tbd
  JOIN financial_transactions ft ON ft.id = tbd.transaction_id
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE tbd.bank_account_id = p_bank_account_id
    AND NOT ft.is_void
    AND (p_include_pending OR ft.status = 'confirmed');
  
  RETURN v_initial_balance + v_transactions_balance + v_distributed_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_bank_balance IS 
'Calcula saldo real de uma conta bancária.
Considera: saldo inicial + transações diretas + transações distribuídas.
p_include_pending: se TRUE, inclui transações pendentes no cálculo.';

-- 4. Função para buscar transações sem banco (legadas)
CREATE OR REPLACE FUNCTION get_unbanked_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  transaction_id UUID,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL,
  transaction_type TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id,
    ft.transaction_date,
    ft.description,
    fl.amount,
    CASE 
      WHEN fa.type = 'income' THEN 'receita'
      WHEN fa.type = 'expense' THEN 'despesa'
      ELSE 'outro'
    END as tx_type,
    ft.status
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = p_user_id
    AND ft.bank_account_id IS NULL
    AND NOT ft.is_void
    AND NOT EXISTS (
      SELECT 1 FROM transaction_bank_distribution tbd
      WHERE tbd.transaction_id = ft.id
    )
  ORDER BY ft.transaction_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unbanked_transactions IS 
'Retorna transações que não estão vinculadas a nenhum banco.
Útil para identificar transações legadas que precisam ser atribuídas.';

-- 5. Função para atribuir banco a múltiplas transações
CREATE OR REPLACE FUNCTION assign_bank_to_transactions(
  p_transaction_ids UUID[],
  p_bank_account_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE financial_transactions
  SET bank_account_id = p_bank_account_id,
      updated_at = NOW()
  WHERE id = ANY(p_transaction_ids)
    AND user_id = auth.uid();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_bank_to_transactions IS 
'Atribui um banco a múltiplas transações de uma vez.
Retorna quantidade de transações atualizadas.';

-- 6. Função para distribuir transação entre múltiplos bancos
CREATE OR REPLACE FUNCTION distribute_transaction_to_banks(
  p_transaction_id UUID,
  p_distributions JSONB -- [{"bank_account_id": "uuid", "amount": 1000, "percentage": 60}]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_distribution JSONB;
  v_total_amount DECIMAL;
  v_distributed_amount DECIMAL;
BEGIN
  -- Verificar se transação pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM financial_transactions
    WHERE id = p_transaction_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Transação não encontrada ou não pertence ao usuário';
  END IF;
  
  -- Buscar valor total da transação
  SELECT fl.amount INTO v_total_amount
  FROM financial_ledger fl
  WHERE fl.transaction_id = p_transaction_id
  LIMIT 1;
  
  -- Calcular total distribuído
  SELECT SUM((d->>'amount')::DECIMAL) INTO v_distributed_amount
  FROM jsonb_array_elements(p_distributions) d;
  
  -- Validar que soma das distribuições = valor total
  IF ABS(v_total_amount - v_distributed_amount) > 0.01 THEN
    RAISE EXCEPTION 'Soma das distribuições (%) não corresponde ao valor total (%)', 
      v_distributed_amount, v_total_amount;
  END IF;
  
  -- Limpar distribuições antigas
  DELETE FROM transaction_bank_distribution
  WHERE transaction_id = p_transaction_id;
  
  -- Inserir novas distribuições
  FOR v_distribution IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    INSERT INTO transaction_bank_distribution (
      transaction_id,
      bank_account_id,
      amount,
      percentage
    ) VALUES (
      p_transaction_id,
      (v_distribution->>'bank_account_id')::UUID,
      (v_distribution->>'amount')::DECIMAL,
      (v_distribution->>'percentage')::DECIMAL
    );
  END LOOP;
  
  -- Remover bank_account_id direto (agora usa distribuição)
  UPDATE financial_transactions
  SET bank_account_id = NULL
  WHERE id = p_transaction_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION distribute_transaction_to_banks IS 
'Distribui uma transação entre múltiplos bancos.
Exemplo: {"bank_account_id": "uuid1", "amount": 6000, "percentage": 60}';
