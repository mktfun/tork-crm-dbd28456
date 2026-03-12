-- =====================================================
-- MELHORIAS NA FUNÇÃO get_financial_summary
-- =====================================================
-- 
-- Mudanças:
-- 1. Usar due_date para transações pendentes (ao invés de transaction_date)
-- 2. Adicionar campos completedTransactionCount e pendingTransactionCount
-- 3. Adicionar campos periodStart e periodEnd para referência
--
-- Data: 2026-01-30
-- =====================================================

CREATE OR REPLACE FUNCTION get_financial_summary(p_start_date DATE, p_end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID;
  v_total_income NUMERIC := 0;
  v_total_expense NUMERIC := 0;
  v_pending_income NUMERIC := 0;
  v_pending_expense NUMERIC := 0;
  v_completed_count INT := 0;
  v_pending_count INT := 0;
  v_cash_balance NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- ============================================
  -- 1. RECEITAS/DESPESAS EFETIVADAS (completed)
  -- ============================================
  SELECT
    COALESCE(SUM(CASE 
      WHEN fa.type = 'revenue' THEN ABS(fl.amount) 
      ELSE 0 
    END), 0),
    COALESCE(SUM(CASE 
      WHEN fa.type = 'expense' THEN ABS(fl.amount) 
      ELSE 0 
    END), 0),
    COUNT(DISTINCT ft.id)
  INTO v_total_income, v_total_expense, v_completed_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.is_void = false
    AND COALESCE(ft.status, 'pending') = 'completed'
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- ============================================
  -- 2. RECEITAS/DESPESAS PENDENTES (pending)
  -- USANDO due_date ao invés de transaction_date
  -- ============================================
  SELECT
    COALESCE(SUM(CASE 
      WHEN fa.type = 'revenue' THEN ABS(fl.amount) 
      ELSE 0 
    END), 0),
    COALESCE(SUM(CASE 
      WHEN fa.type = 'expense' THEN ABS(fl.amount) 
      ELSE 0 
    END), 0),
    COUNT(DISTINCT ft.id)
  INTO v_pending_income, v_pending_expense, v_pending_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    -- MUDANÇA: Usar due_date se existir, senão transaction_date
    AND COALESCE(ft.due_date, ft.transaction_date) BETWEEN p_start_date AND p_end_date
    AND ft.is_void = false
    AND COALESCE(ft.status, 'pending') = 'pending'
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- ============================================
  -- 3. SALDO EM CAIXA (não filtrado por data)
  -- ============================================
  SELECT COALESCE(SUM(fl.amount), 0)
  INTO v_cash_balance
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE fa.user_id = v_user_id
    AND fa.name = 'Caixa'
    AND fa.type = 'asset';

  -- ============================================
  -- 4. RETORNAR JSON COM NOVOS CAMPOS
  -- ============================================
  RETURN JSON_BUILD_OBJECT(
    'totalIncome', v_total_income,
    'totalExpense', v_total_expense,
    'netResult', v_total_income - v_total_expense,
    'pendingIncome', v_pending_income,
    'pendingExpense', v_pending_expense,
    'completedTransactionCount', v_completed_count,
    'pendingTransactionCount', v_pending_count,
    'transactionCount', v_completed_count + v_pending_count,
    'cashBalance', v_cash_balance,
    'periodStart', p_start_date,
    'periodEnd', p_end_date
  );
END;
$$;

-- =====================================================
-- COMENTÁRIOS DA FUNÇÃO
-- =====================================================
COMMENT ON FUNCTION get_financial_summary(DATE, DATE) IS 
'Retorna resumo financeiro do período com receitas/despesas efetivadas e pendentes. 
Transações pendentes são filtradas por due_date (data de vencimento) ao invés de transaction_date.';
