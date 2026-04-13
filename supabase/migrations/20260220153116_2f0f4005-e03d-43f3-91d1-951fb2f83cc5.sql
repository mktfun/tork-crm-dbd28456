-- Atualiza get_dashboard_financial_kpis para usar apenas receitas CONCILIADAS
CREATE OR REPLACE FUNCTION public.get_dashboard_financial_kpis(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_total_commission NUMERIC;
  v_pending_commission NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Não autenticado');
  END IF;

  -- Comissão CONCILIADA no período (reconciled = true, receitas do ledger)
  SELECT COALESCE(SUM(ABS(fl.amount)), 0) INTO v_total_commission
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND (ft.is_void = false OR ft.is_void IS NULL)
    AND ft.reconciled = true
    AND fa.type = 'revenue'
    AND fl.amount < 0
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date);

  -- Comissão PENDENTE DE CONCILIAÇÃO (receitas não conciliadas ainda)
  SELECT COALESCE(SUM(ABS(fl.amount)), 0) INTO v_pending_commission
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND (ft.is_void = false OR ft.is_void IS NULL)
    AND (ft.reconciled = false OR ft.reconciled IS NULL)
    AND fa.type = 'revenue'
    AND fl.amount < 0
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date);

  RETURN json_build_object(
    'totalCommission', v_total_commission,
    'pendingCommission', v_pending_commission,
    'netCommission', v_total_commission
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_financial_kpis(DATE, DATE) TO authenticated;

-- Atualiza get_monthly_commission_chart para usar apenas receitas conciliadas
-- agrupadas pela data de conciliação (reconciled_at)
CREATE OR REPLACE FUNCTION public.get_monthly_commission_chart(
  p_months INT DEFAULT 6
)
RETURNS TABLE (
  month_label TEXT,
  month_date DATE,
  confirmed_amount NUMERIC,
  pending_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT
      date_trunc('month', CURRENT_DATE - (n || ' months')::INTERVAL)::DATE as month_start
    FROM generate_series(0, p_months - 1) n
  ),
  ledger_data AS (
    SELECT
      date_trunc('month',
        COALESCE(ft.reconciled_at::DATE, ft.transaction_date)
      )::DATE as tx_month,
      ABS(fl.amount) as tx_amount,
      COALESCE(ft.reconciled, false) as is_reconciled
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = v_user_id
      AND (ft.is_void = false OR ft.is_void IS NULL)
      AND fa.type = 'revenue'
      AND fl.amount < 0
  )
  SELECT
    to_char(m.month_start, 'Mon/YY')::TEXT as month_label,
    m.month_start as month_date,
    COALESCE(SUM(CASE WHEN ld.is_reconciled = true THEN ld.tx_amount ELSE 0 END), 0)::NUMERIC as confirmed_amount,
    COALESCE(SUM(CASE WHEN ld.is_reconciled = false THEN ld.tx_amount ELSE 0 END), 0)::NUMERIC as pending_amount
  FROM months m
  LEFT JOIN ledger_data ld ON date_trunc('month', ld.tx_month) = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_commission_chart(INT) TO authenticated;