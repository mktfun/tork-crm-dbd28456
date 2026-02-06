-- =====================================================
-- FIX: Adicionar coluna status e corrigir funções SQL
-- =====================================================
-- 
-- Problemas corrigidos:
-- 1. Coluna 'status' não existe em financial_transactions
-- 2. Comparação de ENUM com texto
-- 3. NaN em saldos por banco
--
-- Data: 2026-02-06
-- =====================================================

-- 1. Adicionar coluna status em financial_transactions SE não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'financial_transactions' 
                 AND column_name = 'status') THEN
    ALTER TABLE financial_transactions 
    ADD COLUMN status TEXT DEFAULT 'confirmed';
    
    COMMENT ON COLUMN financial_transactions.status IS 
      'Status da transação: pending, confirmed, cancelled';
  END IF;
END $$;

-- 2. Corrigir get_bank_balance - Versão simplificada que funciona
CREATE OR REPLACE FUNCTION get_bank_balance(
  p_bank_account_id UUID,
  p_include_pending BOOLEAN DEFAULT false
)
RETURNS DECIMAL AS $$
DECLARE
  v_initial_balance DECIMAL;
  v_movements_balance DECIMAL;
BEGIN
  -- Buscar saldo inicial
  SELECT COALESCE(current_balance, 0) INTO v_initial_balance
  FROM bank_accounts
  WHERE id = p_bank_account_id;
  
  IF v_initial_balance IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular saldo dos movimentos (simplificado)
  -- Positivo = entrada, Negativo = saída
  SELECT COALESCE(SUM(
    CASE 
      WHEN fa.type::TEXT IN ('revenue', 'asset') THEN ABS(fl.amount)
      WHEN fa.type::TEXT = 'expense' THEN -ABS(fl.amount)
      ELSE 0
    END
  ), 0) INTO v_movements_balance
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.bank_account_id = p_bank_account_id
    AND NOT COALESCE(ft.is_void, false)
    AND (p_include_pending OR COALESCE(ft.status, 'confirmed') = 'confirmed')
    AND fl.amount > 0;
  
  RETURN v_initial_balance + COALESCE(v_movements_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Corrigir get_bank_transactions - Versão simplificada
DROP TYPE IF EXISTS bank_transaction_row CASCADE;
CREATE TYPE bank_transaction_row AS (
  transaction_id UUID,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL,
  account_name TEXT,
  account_type TEXT,
  bank_account_id UUID,
  bank_name TEXT,
  bank_color TEXT,
  status TEXT,
  is_void BOOLEAN,
  related_entity_type TEXT,
  related_entity_id UUID
);

CREATE OR REPLACE FUNCTION get_bank_transactions(
  p_bank_account_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  transactions bank_transaction_row[],
  total_count INTEGER,
  total_income DECIMAL,
  total_expense DECIMAL,
  page_count INTEGER
) AS $$
DECLARE
  v_offset INTEGER;
  v_user_id UUID;
  v_transactions bank_transaction_row[];
  v_total INTEGER;
  v_income DECIMAL;
  v_expense DECIMAL;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- Buscar transações paginadas
  SELECT ARRAY_AGG(row_data) INTO v_transactions
  FROM (
    SELECT ROW(
      ft.id,
      ft.transaction_date,
      ft.description,
      ABS(fl.amount),
      fa.name,
      fa.type::TEXT,
      ft.bank_account_id,
      ba.bank_name,
      ba.color,
      COALESCE(ft.status, 'confirmed'),
      COALESCE(ft.is_void, false),
      ft.related_entity_type,
      ft.related_entity_id
    )::bank_transaction_row as row_data
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id
    WHERE ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, false)
      AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
      AND (p_bank_account_id IS NOT NULL OR ft.bank_account_id IS NOT NULL)
      AND fl.amount > 0
    ORDER BY ft.transaction_date DESC, ft.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) sub;

  -- Contar total
  SELECT COUNT(DISTINCT ft.id) INTO v_total
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    AND (p_bank_account_id IS NOT NULL OR ft.bank_account_id IS NOT NULL);

  -- Calcular totais
  SELECT 
    COALESCE(SUM(CASE WHEN fa.type::TEXT = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type::TEXT = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_income, v_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND COALESCE(ft.status, 'confirmed') = 'confirmed'
    AND fl.amount > 0
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    AND (p_bank_account_id IS NOT NULL OR ft.bank_account_id IS NOT NULL);

  RETURN QUERY SELECT 
    COALESCE(v_transactions, ARRAY[]::bank_transaction_row[]),
    COALESCE(v_total, 0),
    COALESCE(v_income, 0),
    COALESCE(v_expense, 0),
    GREATEST(CEIL(COALESCE(v_total, 0)::DECIMAL / p_page_size)::INTEGER, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_bank_balance IS 
'Calcula saldo real de uma conta bancária. Versão corrigida.';

COMMENT ON FUNCTION get_bank_transactions IS 
'Busca transações de um banco com paginação. Versão corrigida.';
