-- Migration: Add operationalPending fields to get_financial_summary
-- Problem: "Total Aberto" (Global Pending) includes far future transactions (2026, 2027), inflating the number to 60k.
-- Solution: Add operationalPendingIncome/Expense that filters transaction_date <= CURRENT_DATE + 30.

CREATE OR REPLACE FUNCTION get_financial_summary(p_start_date DATE, p_end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_income NUMERIC := 0;
  v_total_expense NUMERIC := 0;
  v_pending_income NUMERIC := 0;
  v_pending_expense NUMERIC := 0;
  v_completed_count INT := 0;
  v_pending_count INT := 0;
  v_cash_balance NUMERIC := 0;
  
  -- Campos globais (Tudo em aberto)
  v_global_pending_income NUMERIC := 0;
  v_global_pending_expense NUMERIC := 0;
  v_global_pending_count INT := 0;
  
  -- Campos operacionais (Vencidos + Próximos 30 dias)
  v_operational_pending_income NUMERIC := 0;
  v_operational_pending_expense NUMERIC := 0;
  v_operational_pending_count INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- 1. EFETIVADAS (No período)
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0),
    COUNT(DISTINCT ft.id)
  INTO v_total_income, v_total_expense, v_completed_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.is_void = false
    AND ft.reconciled = true
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- 2. PENDENTES (No período)
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0),
    COUNT(DISTINCT ft.id)
  INTO v_pending_income, v_pending_expense, v_pending_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND COALESCE(ft.due_date, ft.transaction_date) BETWEEN p_start_date AND p_end_date
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed' -- Mantendo lógica legacy, mas note que status pode ser text.
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- 3. GLOBAIS (Tudo) - Mantemos para referência se precisar
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0),
    COUNT(DISTINCT ft.id)
  INTO v_global_pending_income, v_global_pending_expense, v_global_pending_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed'
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));
    
  -- 4. OPERACIONAIS (Vencidos + 30 dias) - O que o usuário quer ver no card
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0),
    COUNT(DISTINCT ft.id)
  INTO v_operational_pending_income, v_operational_pending_expense, v_operational_pending_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed'
    -- FILTRO MÁGICO: Até hoje + 30 dias
    AND ft.transaction_date <= (CURRENT_DATE + 30)
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- 5. CAIXA
  SELECT COALESCE(SUM(fl.amount), 0)
  INTO v_cash_balance
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE fa.user_id = v_user_id
    AND fa.name = 'Caixa'
    AND fa.type = 'asset';

  RETURN JSON_BUILD_OBJECT(
    'totalIncome', v_total_income,
    'totalExpense', v_total_expense,
    'netResult', v_total_income - v_total_expense,
    'pendingIncome', v_pending_income, -- Do período selecionado
    'pendingExpense', v_pending_expense,
    'completedTransactionCount', v_completed_count,
    'pendingTransactionCount', v_pending_count,
    'transactionCount', v_completed_count + v_pending_count,
    'cashBalance', v_cash_balance,
    'globalPendingIncome', v_global_pending_income, -- Tudo (inclui 2027)
    'globalPendingExpense', v_global_pending_expense,
    'globalPendingCount', v_global_pending_count,
    'operationalPendingIncome', v_operational_pending_income, -- Curto prazo (O que vai pro Card)
    'operationalPendingExpense', v_operational_pending_expense,
    'operationalPendingCount', v_operational_pending_count,
    'periodStart', p_start_date,
    'periodEnd', p_end_date
  );
END;
$$;
