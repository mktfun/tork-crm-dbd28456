
-- ==============================================================================
-- FIX ANALYTICS DASHBOARD & LEGACY ACCOUNT CLEANUP
-- ==============================================================================

-- 1. Archive legacy accounts
UPDATE financial_accounts 
SET status = 'archived' 
WHERE name IN ('Caixa', 'Banco Principal', 'Comissões a Receber') 
  AND status = 'active';

-- 2. DROP and recreate get_revenue_by_dimension
DROP FUNCTION IF EXISTS get_revenue_by_dimension(uuid, date, date, text);

CREATE OR REPLACE FUNCTION get_revenue_by_dimension(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_dimension TEXT
)
RETURNS TABLE (
  dimension_name TEXT,
  total_amount DECIMAL,
  transaction_count INTEGER,
  percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH revenue_transactions AS (
    SELECT
      ft.total_amount AS tx_amount,
      ft.producer_id,
      ft.ramo_id,
      ft.insurance_company_id,
      a.producer_id AS policy_producer_id,
      a.type AS policy_type,
      a.insurance_company AS policy_company,
      a.ramo_id AS policy_ramo_id
    FROM financial_transactions ft
    LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
    WHERE ft.user_id = p_user_id
      AND ft.type = 'revenue'
      AND ft.is_confirmed = true
      AND NOT COALESCE(ft.is_void, false)
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
  ),
  dimension_data AS (
    SELECT
      rt.tx_amount,
      CASE
        WHEN p_dimension = 'producer' THEN
          COALESCE(
            (SELECT p.nome_completo FROM profiles p WHERE p.id = COALESCE(rt.producer_id, rt.policy_producer_id)),
            'Sem Produtor'
          )
        WHEN p_dimension = 'type' THEN
          COALESCE(
            (SELECT r.nome FROM ramos r WHERE r.id = COALESCE(rt.ramo_id, rt.policy_ramo_id)),
            rt.policy_type,
            'Sem Ramo'
          )
        WHEN p_dimension = 'insurance_company' THEN
          COALESCE(
            (SELECT c.name FROM companies c WHERE c.id = COALESCE(rt.insurance_company_id, rt.policy_company)),
            'Sem Seguradora'
          )
        ELSE 'Desconhecido'
      END AS dim_name
    FROM revenue_transactions rt
  ),
  grouped_totals AS (
    SELECT
      COALESCE(dim_name, 'Não Classificado') AS d_name,
      COALESCE(SUM(tx_amount), 0) AS t_amount,
      COUNT(*)::INTEGER AS t_count
    FROM dimension_data
    GROUP BY dim_name
  ),
  grand_total AS (
    SELECT COALESCE(SUM(t_amount), 0) AS gt FROM grouped_totals
  )
  SELECT
    gt.d_name::TEXT,
    gt.t_amount,
    gt.t_count,
    CASE WHEN g.gt > 0 THEN ROUND((gt.t_amount / g.gt) * 100, 2) ELSE 0::DECIMAL END
  FROM grouped_totals gt
  CROSS JOIN grand_total g
  WHERE gt.t_amount > 0
  ORDER BY gt.t_amount DESC
  LIMIT 10;
END;
$$;

-- 3. DROP and recreate get_goal_vs_actual
DROP FUNCTION IF EXISTS get_goal_vs_actual(uuid, integer, integer, text);

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
  pct DECIMAL,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_amount DECIMAL;
  v_actual_amount DECIMAL;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT fg.goal_amount INTO v_goal_amount
  FROM financial_goals fg
  WHERE fg.user_id = p_user_id
    AND fg.year = p_year
    AND fg.month = p_month
    AND fg.goal_type = p_goal_type;

  IF v_goal_amount IS NULL THEN
    RETURN;
  END IF;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT COALESCE(SUM(ft.total_amount), 0) INTO v_actual_amount
  FROM financial_transactions ft
  WHERE ft.user_id = p_user_id
    AND ft.type = 'revenue'
    AND ft.is_confirmed = true
    AND NOT COALESCE(ft.is_void, false)
    AND ft.transaction_date BETWEEN v_start_date AND v_end_date;

  RETURN QUERY SELECT
    v_goal_amount,
    v_actual_amount,
    (v_actual_amount - v_goal_amount),
    CASE WHEN v_goal_amount > 0 THEN ROUND((v_actual_amount / v_goal_amount) * 100, 2) ELSE 0::DECIMAL END,
    CASE
      WHEN v_actual_amount >= v_goal_amount THEN 'achieved'
      WHEN v_actual_amount >= (v_goal_amount * 0.8) THEN 'near'
      ELSE 'below'
    END;
END;
$$;

-- 4. DROP and recreate get_recent_financial_transactions
DROP FUNCTION IF EXISTS get_recent_financial_transactions(integer, integer, text);

CREATE OR REPLACE FUNCTION get_recent_financial_transactions(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  transaction_date DATE,
  reference_number TEXT,
  created_at TIMESTAMPTZ,
  is_void BOOLEAN,
  total_amount NUMERIC,
  account_names TEXT,
  status TEXT,
  is_confirmed BOOLEAN,
  reconciled BOOLEAN
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
    ft.reference_number,
    ft.created_at,
    COALESCE(ft.is_void, false),
    COALESCE(
      (SELECT SUM(ABS(fl.amount)) FROM financial_ledger fl WHERE fl.transaction_id = ft.id), 0
    ) / 2 AS total_amount,
    COALESCE(
      (SELECT string_agg(DISTINCT fa.name, ', ')
       FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id),
      'Sem Categoria'
    ) AS account_names,
    ft.status,
    ft.is_confirmed,
    COALESCE(ft.reconciled, false)
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND (p_type IS NULL OR ft.type = p_type)
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
