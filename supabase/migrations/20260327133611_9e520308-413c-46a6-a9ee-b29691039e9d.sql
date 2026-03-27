CREATE OR REPLACE FUNCTION public.get_financial_summary(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID; v_current_income NUMERIC := 0; v_current_expense NUMERIC := 0;
  v_current_pending_income NUMERIC := 0; v_current_pending_expense NUMERIC := 0;
  v_current_op_pending_income NUMERIC := 0; v_prev_income NUMERIC := 0; v_prev_expense NUMERIC := 0;
  v_prev_pending_income NUMERIC := 0; v_prev_pending_expense NUMERIC := 0;
  v_period_days INTEGER; v_prev_start_date DATE; v_prev_end_date DATE;
  v_cash_balance NUMERIC := 0; v_global_pending_income NUMERIC := 0; v_global_pending_expense NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;
  v_period_days := p_end_date - p_start_date;
  v_prev_end_date := p_start_date - 1;
  v_prev_start_date := v_prev_end_date - v_period_days;

  -- CURRENT PERIOD: income/expense (reconciled fully OR partial with paid_amount)
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount
           ELSE 0 END
    ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount
           ELSE 0 END
    ELSE 0 END),0)
  INTO v_current_income, v_current_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored'
    AND (COALESCE(t.reconciled,false)=true OR COALESCE(t.paid_amount,0) > 0);

  -- CURRENT PERIOD: pending (not reconciled AND no paid_amount)
  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_current_pending_income, v_current_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.due_date,t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.paid_amount,0)=0
    AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  -- OPERATIONAL pending income (global, next 30 days)
  SELECT COALESCE(SUM(t.total_amount - COALESCE(t.paid_amount,0)),0) INTO v_current_op_pending_income FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.transaction_date<=(CURRENT_DATE+30) AND t.type IN ('revenue','income','Entrada');

  -- PREVIOUS PERIOD: income/expense (same partial logic)
  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount
           ELSE 0 END
    ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount
           ELSE 0 END
    ELSE 0 END),0)
  INTO v_prev_income, v_prev_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND t.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored'
    AND (COALESCE(t.reconciled,false)=true OR COALESCE(t.paid_amount,0) > 0);

  -- PREVIOUS PERIOD: pending
  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_prev_pending_income, v_prev_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.due_date,t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.paid_amount,0)=0
    AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  -- GLOBAL pending
  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount - COALESCE(t.paid_amount,0) ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount - COALESCE(t.paid_amount,0) ELSE 0 END),0)
  INTO v_global_pending_income, v_global_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.type IN ('revenue','expense','income','Entrada','Saída');

  SELECT COALESCE(SUM(current_balance),0) INTO v_cash_balance FROM bank_accounts WHERE user_id=v_user_id AND is_active=true;

  RETURN JSON_BUILD_OBJECT(
    'current', JSON_BUILD_OBJECT('totalIncome',v_current_income,'totalExpense',v_current_expense,
      'netResult',v_current_income-v_current_expense,'pendingIncome',v_current_pending_income,
      'pendingExpense',v_current_pending_expense,'operationalPendingIncome',v_current_op_pending_income,
      'globalPendingIncome',v_global_pending_income,'globalPendingExpense',v_global_pending_expense,'cashBalance',v_cash_balance),
    'previous', JSON_BUILD_OBJECT('totalIncome',v_prev_income,'totalExpense',v_prev_expense,
      'netResult',v_prev_income-v_prev_expense,'pendingIncome',v_prev_pending_income,
      'pendingExpense',v_prev_pending_expense,'start_date',v_prev_start_date,'end_date',v_prev_end_date));
END;$function$;