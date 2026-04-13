-- Fix: get_financial_summary to correctly calculate KPIs using financial_ledger
-- This resolves the bug where legacy OFX reconciled transactions (with type=null and total_amount=0) zeroed out the KPIs.

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start_date date,
  p_end_date date
) RETURNS jsonb
   LANGUAGE plpgsql
   SECURITY INVOKER
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
  
  -- Dates
  v_period_days INTEGER;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  
  -- Global/Cash
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
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' THEN tx_data.amount ELSE 0 END), 0)
  INTO v_current_income, v_current_expense
  FROM financial_transactions t
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = t.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE t.user_id = v_user_id
    AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.status, 'pending') != 'ignored'
    AND COALESCE(t.reconciled, false) = true;

  -- Pending (In Period) - "Vencendo este Mês"
  SELECT
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' THEN tx_data.amount ELSE 0 END), 0)
  INTO v_current_pending_income, v_current_pending_expense
  FROM financial_transactions t
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = t.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE t.user_id = v_user_id
    AND COALESCE(t.due_date, t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored');

  -- Operational Pending (Up to Today + 30) - For "Total Geral a Receber"
  SELECT
    COALESCE(SUM(tx_data.amount), 0)
  INTO v_current_op_pending_income
  FROM financial_transactions t
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = t.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE t.user_id = v_user_id
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored')
    AND t.transaction_date <= (CURRENT_DATE + 30)
    AND tx_data.type IN ('revenue', 'income');


  -- ==========================================
  -- 2. PREVIOUS PERIOD
  -- ==========================================

  -- Realized
  SELECT
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' THEN tx_data.amount ELSE 0 END), 0)
  INTO v_prev_income, v_prev_expense
  FROM financial_transactions t
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = t.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE t.user_id = v_user_id
    AND t.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.status, 'pending') != 'ignored'
    AND COALESCE(t.reconciled, false) = true;

  -- Pending (In Previous Period)
  SELECT
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' THEN tx_data.amount ELSE 0 END), 0)
  INTO v_prev_pending_income, v_prev_pending_expense
  FROM financial_transactions t
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = t.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE t.user_id = v_user_id
    AND COALESCE(t.due_date, t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored');


  -- ==========================================
  -- 3. GLOBALS (Snapshot)
  -- ==========================================
  
  -- Global Pending (All time)
  SELECT
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' THEN tx_data.amount ELSE 0 END), 0)
  INTO v_global_pending_income, v_global_pending_expense
  FROM financial_transactions t
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = t.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE t.user_id = v_user_id
    AND COALESCE(t.is_void, false) = false
    AND COALESCE(t.reconciled, false) = false
    AND COALESCE(t.status, 'pending') NOT IN ('confirmed', 'ignored')
    AND tx_data.type IN ('revenue', 'expense', 'income');

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
      'pendingIncome', v_current_pending_income,
      'pendingExpense', v_current_pending_expense,
      'operationalPendingIncome', v_current_op_pending_income, -- "Total Geral a Receber"
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
