-- =====================================================
-- FIX: Corrigir tipo 'income' para 'revenue' nas funções SQL
-- =====================================================
-- 
-- O ENUM financial_account_type tem 'revenue', não 'income'
-- Esta migração corrige get_bank_balance e get_bank_transactions
--
-- Data: 2026-02-06
-- =====================================================

-- 1. Corrigir get_bank_balance
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
  -- CORRIGIDO: 'revenue' em vez de 'income'
  SELECT COALESCE(SUM(
    CASE 
      WHEN fa.type = 'revenue' THEN fl.amount
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
      WHEN fa.type = 'revenue' THEN tbd.amount
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

-- 2. Corrigir get_bank_transactions (drop e recreate para garantir)
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
      COALESCE(ft.bank_account_id, tbd.bank_account_id),
      ba.bank_name,
      ba.color,
      ft.status,
      ft.is_void,
      ft.related_entity_type,
      ft.related_entity_id
    )::bank_transaction_row as row_data
    FROM financial_transactions ft
    LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
    LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
    LEFT JOIN bank_accounts ba ON ba.id = COALESCE(ft.bank_account_id, tbd.bank_account_id)
    WHERE ft.user_id = v_user_id
      AND NOT ft.is_void
      AND (
        p_bank_account_id IS NULL 
        OR ft.bank_account_id = p_bank_account_id
        OR tbd.bank_account_id = p_bank_account_id
      )
      AND (
        p_bank_account_id IS NOT NULL 
        OR ft.bank_account_id IS NOT NULL 
        OR tbd.bank_account_id IS NOT NULL
      )
      AND fl.amount > 0
    ORDER BY ft.transaction_date DESC, ft.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) sub;

  -- Contar total
  SELECT COUNT(DISTINCT ft.id) INTO v_total
  FROM financial_transactions ft
  LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
  WHERE ft.user_id = v_user_id
    AND NOT ft.is_void
    AND (
      p_bank_account_id IS NULL 
      OR ft.bank_account_id = p_bank_account_id
      OR tbd.bank_account_id = p_bank_account_id
    )
    AND (
      p_bank_account_id IS NOT NULL 
      OR ft.bank_account_id IS NOT NULL 
      OR tbd.bank_account_id IS NOT NULL
    );

  -- Calcular totais (CORRIGIDO: 'revenue' em vez de 'income')
  SELECT 
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_income, v_expense
  FROM financial_transactions ft
  LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
  LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
  WHERE ft.user_id = v_user_id
    AND NOT ft.is_void
    AND ft.status = 'confirmed'
    AND fl.amount > 0
    AND (
      p_bank_account_id IS NULL 
      OR ft.bank_account_id = p_bank_account_id
      OR tbd.bank_account_id = p_bank_account_id
    )
    AND (
      p_bank_account_id IS NOT NULL 
      OR ft.bank_account_id IS NOT NULL 
      OR tbd.bank_account_id IS NOT NULL
    );

  RETURN QUERY SELECT 
    COALESCE(v_transactions, ARRAY[]::bank_transaction_row[]),
    v_total,
    v_income,
    v_expense,
    CEIL(v_total::DECIMAL / p_page_size)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
