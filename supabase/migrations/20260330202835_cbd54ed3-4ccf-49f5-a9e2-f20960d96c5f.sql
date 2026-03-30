-- ==============================================================================
-- FIX: Use reconciled_at for date filtering (cash-basis accounting)
-- ==============================================================================

-- Drop and recreate all 3 functions
DROP FUNCTION IF EXISTS get_financial_summary(date,date);
DROP FUNCTION IF EXISTS get_cash_flow_data(date,date,text);
DROP FUNCTION IF EXISTS get_revenue_transactions(date,date,int);

-- 1. get_financial_summary — KPIs with reconciled_at
CREATE OR REPLACE FUNCTION get_financial_summary(p_start_date DATE, p_end_date DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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

  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0)
  INTO v_current_income, v_current_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id
    AND COALESCE(t.reconciled_at::date, t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored'
    AND (COALESCE(t.reconciled,false)=true OR COALESCE(t.paid_amount,0) > 0);

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_current_pending_income, v_current_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.due_date,t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.paid_amount,0)=0
    AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  SELECT COALESCE(SUM(t.total_amount - COALESCE(t.paid_amount,0)),0) INTO v_current_op_pending_income FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.transaction_date<=(CURRENT_DATE+30) AND t.type IN ('revenue','income','Entrada');

  SELECT
    COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN
      CASE WHEN COALESCE(t.reconciled,false)=true THEN t.total_amount
           WHEN COALESCE(t.paid_amount,0) > 0 THEN t.paid_amount ELSE 0 END
    ELSE 0 END),0)
  INTO v_prev_income, v_prev_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id
    AND COALESCE(t.reconciled_at::date, t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored'
    AND (COALESCE(t.reconciled,false)=true OR COALESCE(t.paid_amount,0) > 0);

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_prev_pending_income, v_prev_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.due_date,t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.paid_amount,0)=0
    AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount - COALESCE(t.paid_amount,0) ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount - COALESCE(t.paid_amount,0) ELSE 0 END),0)
  INTO v_global_pending_income, v_global_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.type IN ('revenue','expense','income','Entrada','Saída');

  SELECT COALESCE(SUM(current_balance),0) INTO v_cash_balance FROM bank_accounts WHERE user_id=v_user_id AND is_active=true;

  RETURN jsonb_build_object(
    'current', jsonb_build_object('totalIncome',v_current_income,'totalExpense',v_current_expense,
      'netResult',v_current_income-v_current_expense,'pendingIncome',v_current_pending_income,
      'pendingExpense',v_current_pending_expense,'operationalPendingIncome',v_current_op_pending_income,
      'globalPendingIncome',v_global_pending_income,'globalPendingExpense',v_global_pending_expense,'cashBalance',v_cash_balance),
    'previous', jsonb_build_object('totalIncome',v_prev_income,'totalExpense',v_prev_expense,
      'netResult',v_prev_income-v_prev_expense,'pendingIncome',v_prev_pending_income,
      'pendingExpense',v_prev_pending_expense,'start_date',v_prev_start_date,'end_date',v_prev_end_date));
END;
$$;

-- 2. get_cash_flow_data — chart with reconciled_at grouping
CREATE OR REPLACE FUNCTION get_cash_flow_data(p_start_date DATE, p_end_date DATE, p_granularity TEXT DEFAULT 'month')
RETURNS TABLE(period_key TEXT, income NUMERIC, expense NUMERIC, net NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id:=auth.uid();
  RETURN QUERY
  WITH periods AS (SELECT CASE p_granularity WHEN 'month' THEN TO_CHAR(d,'YYYY-MM') ELSE TO_CHAR(d,'YYYY-MM-DD') END AS period_key
    FROM generate_series(p_start_date::timestamp,p_end_date::timestamp,CASE p_granularity WHEN 'month' THEN '1 month'::interval ELSE '1 day'::interval END) d),
  tx_data AS (
    SELECT CASE p_granularity
      WHEN 'month' THEN TO_CHAR(COALESCE(ft.reconciled_at::date, ft.transaction_date),'YYYY-MM')
      ELSE TO_CHAR(COALESCE(ft.reconciled_at::date, ft.transaction_date),'YYYY-MM-DD')
    END AS period_key,
    ft.type AS tx_type, ft.total_amount
    FROM financial_transactions ft
    WHERE ft.user_id=v_user_id
      AND COALESCE(ft.reconciled_at::date, ft.transaction_date) BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(ft.is_void,false) AND COALESCE(ft.archived,false)=false
      AND COALESCE(ft.reconciled,false)=true AND COALESCE(ft.status,'pending')!='ignored'),
  aggregated AS (SELECT period_key,COALESCE(SUM(CASE WHEN tx_type IN('revenue','income','Entrada')THEN total_amount ELSE 0 END),0) as income,
    COALESCE(SUM(CASE WHEN tx_type IN('expense','despesa','Saída')THEN total_amount ELSE 0 END),0) as expense FROM tx_data GROUP BY period_key)
  SELECT p.period_key,COALESCE(a.income,0),COALESCE(a.expense,0),COALESCE(a.income,0)-COALESCE(a.expense,0) FROM periods p LEFT JOIN aggregated a ON a.period_key=p.period_key ORDER BY p.period_key;
END;
$$;

-- 3. get_revenue_transactions — list with reconciled_at filtering
CREATE OR REPLACE FUNCTION get_revenue_transactions(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL, p_limit INT DEFAULT 500)
RETURNS TABLE(
  id UUID, description TEXT, transaction_date DATE, amount NUMERIC,
  account_name TEXT, is_confirmed BOOLEAN, reconciled BOOLEAN,
  legacy_status TEXT, client_name TEXT, policy_number TEXT,
  related_entity_id UUID, related_entity_type TEXT, bank_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    ft.id, ft.description, ft.transaction_date,
    COALESCE((SELECT SUM(ABS(fl.amount)) FROM financial_ledger fl JOIN financial_accounts fa ON fa.id = fl.account_id WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'),0) AS amount,
    (SELECT fa.name FROM financial_ledger fl JOIN financial_accounts fa ON fa.id = fl.account_id WHERE fl.transaction_id = ft.id AND fa.type = 'revenue' LIMIT 1) AS account_name,
    (COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')) AS is_confirmed,
    COALESCE(ft.reconciled, false) as reconciled,
    NULL::text AS legacy_status, NULL::text AS client_name, NULL::text AS policy_number,
    ft.related_entity_id, ft.related_entity_type,
    COALESCE(
      (SELECT fa.name FROM financial_ledger fl JOIN financial_accounts fa ON fa.id = fl.account_id WHERE fl.transaction_id = ft.id AND fa.type = 'asset' LIMIT 1),
      (SELECT ba.bank_name FROM bank_accounts ba WHERE ba.id = ft.bank_account_id)
    ) AS bank_name
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND EXISTS (SELECT 1 FROM financial_ledger fl JOIN financial_accounts fa ON fa.id = fl.account_id WHERE fl.transaction_id = ft.id AND fa.type = 'revenue')
    AND (p_start_date IS NULL OR COALESCE(ft.reconciled_at::date, ft.transaction_date) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(ft.reconciled_at::date, ft.transaction_date) <= p_end_date)
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit;
END;
$$;