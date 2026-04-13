-- =====================================================
-- DASHBOARD REFINEMENTS & FIXES
-- =====================================================

-- 1. FIX: get_cash_flow_data (Usar RECONCILED para efetivado)
DROP FUNCTION IF EXISTS public.get_cash_flow_data(date, date, text);

CREATE OR REPLACE FUNCTION public.get_cash_flow_data(
  p_start_date date,
  p_end_date date,
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE(period text, income numeric, expense numeric, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH periods AS (
    SELECT
      CASE p_granularity
        WHEN 'month' THEN TO_CHAR(d, 'YYYY-MM')
        ELSE TO_CHAR(d, 'YYYY-MM-DD')
      END AS period_key
    FROM generate_series(p_start_date::timestamp, p_end_date::timestamp,
      CASE p_granularity WHEN 'month' THEN '1 month'::interval ELSE '1 day'::interval END
    ) d
  ),
  ledger_data AS (
    SELECT
      CASE p_granularity
        WHEN 'month' THEN TO_CHAR(ft.transaction_date, 'YYYY-MM')
        ELSE TO_CHAR(ft.transaction_date, 'YYYY-MM-DD')
      END AS period_key,
      fa.type AS account_type,
      fl.amount
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = v_user_id
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(ft.is_void, false)
      -- FIX: Usar reconciled = true para garantir que está efetivado
      AND ft.reconciled = true
      AND fa.type IN ('revenue', 'expense')
  ),
  aggregated AS (
    SELECT
      period_key,
      COALESCE(SUM(CASE WHEN account_type = 'revenue' THEN ABS(amount) ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN account_type = 'expense' THEN ABS(amount) ELSE 0 END), 0) as expense
    FROM ledger_data
    GROUP BY period_key
  )
  SELECT
    p.period_key AS period,
    COALESCE(a.income, 0) AS income,
    COALESCE(a.expense, 0) AS expense,
    COALESCE(a.income, 0) - COALESCE(a.expense, 0) AS balance
  FROM periods p
  LEFT JOIN aggregated a ON a.period_key = p.period_key
  ORDER BY p.period_key;
END;
$$;


-- 2. FIX: get_revenue_transactions (Incluir bank_name)
DROP FUNCTION IF EXISTS public.get_revenue_transactions(date, date, integer);

CREATE OR REPLACE FUNCTION public.get_revenue_transactions(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  description text,
  transaction_date date,
  amount numeric,
  account_name text,
  is_confirmed boolean,
  reconciled boolean,
  legacy_status text,
  client_name text,
  policy_number text,
  related_entity_id uuid,
  related_entity_type text,
  bank_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.description,
    ft.transaction_date,
    -- Valor absoluto da conta de receita
    COALESCE(
      (SELECT SUM(ABS(fl.amount)) FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'),
      0
    ) AS amount,
    -- Nome da categoria de receita
    (SELECT fa.name FROM financial_ledger fl
     JOIN financial_accounts fa ON fa.id = fl.account_id
     WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
     LIMIT 1) AS account_name,
    (COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')) AS is_confirmed,
    COALESCE(ft.reconciled, false) as reconciled,
    NULL::text AS legacy_status,
    NULL::text AS client_name,
    NULL::text AS policy_number,
    ft.related_entity_id,
    ft.related_entity_type,
    -- Nome do banco (via conta asset associada)
    (SELECT fa.name FROM financial_ledger fl
     JOIN financial_accounts fa ON fa.id = fl.account_id
     WHERE fl.transaction_id = ft.id AND fa.type = 'asset'
     LIMIT 1) AS bank_name
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND EXISTS (
      SELECT 1 FROM financial_ledger fl
      JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
    )
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit;
END;
$$;


-- 3. FIX: get_goal_vs_actual (Corrigir lógica de cálculo)
CREATE OR REPLACE FUNCTION get_goal_vs_actual(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_goal_type TEXT DEFAULT 'revenue'
)
RETURNS TABLE (
  goal_amount DECIMAL,
  actual_amount DECIMAL,
  difference DECIMAL,
  percentage_achieved DECIMAL,
  status TEXT
) AS $$
DECLARE
  v_goal_amount DECIMAL;
  v_actual_amount DECIMAL;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Buscar meta
  SELECT fg.goal_amount INTO v_goal_amount
  FROM financial_goals fg
  WHERE fg.user_id = p_user_id
    AND fg.year = p_year
    AND fg.month = p_month
    AND fg.goal_type = p_goal_type;
  
  -- Se não houver meta, retornar vazio
  IF v_goal_amount IS NULL THEN
    RETURN;
  END IF;
  
  -- Calcular período
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- FIX: Buscar faturamento realizado (receitas RECONCILIADAS)
  -- Usar type='revenue' (não 'income') e ABS(amount)
  SELECT COALESCE(SUM(ABS(fl.amount)), 0) INTO v_actual_amount
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = p_user_id
    AND fa.type = 'revenue' -- FIX: era 'income'
    AND ft.reconciled = true -- FIX: usar reconciled
    AND NOT COALESCE(ft.is_void, false)
    -- AND fl.amount < 0 -- Receitas geralmente são crédito (negativo), mas usamos ABS então removemos este filtro para pegar tudo
    AND ft.transaction_date BETWEEN v_start_date AND v_end_date;
  
  -- Retornar comparação
  RETURN QUERY
  SELECT 
    v_goal_amount,
    v_actual_amount,
    (v_actual_amount - v_goal_amount) as diff,
    CASE 
      WHEN v_goal_amount > 0 THEN ROUND((v_actual_amount / v_goal_amount) * 100, 2)
      ELSE 0
    END as pct,
    CASE 
      WHEN v_actual_amount >= v_goal_amount THEN 'achieved'
      WHEN v_actual_amount >= (v_goal_amount * 0.8) THEN 'near'
      ELSE 'below'
    END as goal_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
