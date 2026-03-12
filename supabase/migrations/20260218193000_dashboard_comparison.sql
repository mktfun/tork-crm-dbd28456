-- Migration: Update get_financial_summary for Period Comparsion
-- Purpose: Return financial summary for Current AND Previous period to enable growth indicators.

CREATE OR REPLACE FUNCTION get_financial_summary(p_start_date DATE, p_end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  
  -- Current Period Variables
  v_current_income NUMERIC := 0;
  v_current_expense NUMERIC := 0;
  v_current_pending_income NUMERIC := 0;
  v_current_pending_expense NUMERIC := 0;
  v_current_op_pending_income NUMERIC := 0; -- Operational (This Month/Overdue)
  
  -- Previous Period Variables
  v_prev_income NUMERIC := 0;
  v_prev_expense NUMERIC := 0;
  v_prev_pending_income NUMERIC := 0;
  v_prev_pending_expense NUMERIC := 0;
  v_prev_op_pending_income NUMERIC := 0;
  
  -- Dates
  v_period_days INTEGER;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  
  -- Global/Cash (Point in time, no comparison needed usually, but let's keep it simple)
  v_cash_balance NUMERIC := 0;
  v_global_pending_income NUMERIC := 0;
  v_global_pending_expense NUMERIC := 0;

BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Calculate Previous Period
  v_period_days := p_end_date - p_start_date;
  v_prev_end_date := p_start_date - 1;
  v_prev_start_date := v_prev_end_date - v_period_days;

  -- ==========================================
  -- 1. CURRENT PERIOD
  -- ==========================================
  
  -- Realized (Reconciled)
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_current_income, v_current_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.is_void = false
    AND ft.reconciled = true
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- Pending (In Period) - "Vencendo este Mês" (if filter is month)
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_current_pending_income, v_current_pending_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND COALESCE(ft.due_date, ft.transaction_date) BETWEEN p_start_date AND p_end_date
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed'
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- Operational Pending (Up to Today + 30) - For "Total Geral a Receber" (Realistic)
  -- Note: This is a point-in-time metric, maybe comparison implies "what was it last month?" 
  -- Hard to reconstruct history of "what was pending last month". 
  -- For comparison, we usually stick to "what WAS due last month that was pending"? 
  -- Let's stick to the Pending In Period for comparison of "Vencendo".
  -- Operational Pending is a current snapshot.
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_current_op_pending_income
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed'
    AND ft.transaction_date <= (CURRENT_DATE + 30)
    AND fa.type = 'revenue'
    AND fl.amount < 0;


  -- ==========================================
  -- 2. PREVIOUS PERIOD
  -- ==========================================

  -- Realized
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_prev_income, v_prev_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND ft.is_void = false
    AND ft.reconciled = true
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- Pending (In Previous Period)
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_prev_pending_income, v_prev_pending_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND COALESCE(ft.due_date, ft.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed'
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));


  -- ==========================================
  -- 3. GLOBALS (Snapshot)
  -- ==========================================
  
  -- Global Pending (All time)
  SELECT
    COALESCE(SUM(CASE WHEN fa.type = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_global_pending_income, v_global_pending_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.is_void = false
    AND ft.reconciled = false
    AND COALESCE(ft.status, 'pending') != 'confirmed'
    AND fa.type IN ('revenue', 'expense')
    AND ((fa.type = 'revenue' AND fl.amount < 0) OR (fa.type = 'expense' AND fl.amount > 0));

  -- Cash Balance
  SELECT COALESCE(SUM(fl.amount), 0)
  INTO v_cash_balance
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE fa.user_id = v_user_id
    AND fa.name = 'Caixa'
    AND fa.type = 'asset';


  -- ==========================================
  -- 4. BUILD RESULT
  -- ==========================================

  RETURN JSON_BUILD_OBJECT(
    'current', JSON_BUILD_OBJECT(
      'totalIncome', v_current_income,
      'totalExpense', v_current_expense,
      'netResult', v_current_income - v_current_expense,
      'pendingIncome', v_current_pending_income, -- "Vencendo este Mês"
      'pendingExpense', v_current_pending_expense,
      'operationalPendingIncome', v_current_op_pending_income, -- "Total Geral a Receber" (Realistic)
      'globalPendingIncome', v_global_pending_income,
      'globalPendingExpense', v_global_pending_expense,
      'cashBalance', v_cash_balance
    ),
    'previous', JSON_BUILD_OBJECT(
      'totalIncome', v_prev_income,
      'totalExpense', v_prev_expense,
      'netResult', v_prev_income - v_prev_expense,
      'pendingIncome', v_prev_pending_income,
      'pendingExpense', v_prev_pending_expense,
      'start_date', v_prev_start_date,
      'end_date', v_prev_end_date
    )
  );
END;
$$;
