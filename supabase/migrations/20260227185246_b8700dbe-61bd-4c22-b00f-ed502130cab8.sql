-- Fase 1A: Reescrever get_cash_flow_data para usar ft.type + ft.total_amount
-- em vez de fa.type no ledger. Alinha com get_financial_summary.
CREATE OR REPLACE FUNCTION public.get_cash_flow_data(
  p_start_date date, 
  p_end_date date, 
  p_granularity text DEFAULT 'day'::text
)
RETURNS TABLE(period text, income numeric, expense numeric, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    FROM generate_series(
      p_start_date::timestamp, 
      p_end_date::timestamp,
      CASE p_granularity WHEN 'month' THEN '1 month'::interval ELSE '1 day'::interval END
    ) d
  ),
  tx_data AS (
    SELECT
      CASE p_granularity
        WHEN 'month' THEN TO_CHAR(ft.transaction_date, 'YYYY-MM')
        ELSE TO_CHAR(ft.transaction_date, 'YYYY-MM-DD')
      END AS period_key,
      ft.type AS tx_type,
      ft.total_amount
    FROM financial_transactions ft
    WHERE ft.user_id = v_user_id
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(ft.is_void, false)
      AND COALESCE(ft.reconciled, false) = true
      AND COALESCE(ft.status, 'pending') != 'ignored'
  ),
  aggregated AS (
    SELECT
      period_key,
      COALESCE(SUM(CASE WHEN tx_type IN ('revenue', 'income', 'Entrada') THEN total_amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN tx_type IN ('expense', 'despesa', 'Saída') THEN total_amount ELSE 0 END), 0) as expense
    FROM tx_data
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
$function$;

-- Fase 1B: Reescrever get_revenue_by_dimension para usar reconciled=true
-- em vez de is_confirmed=true. Alinha com get_financial_summary.
CREATE OR REPLACE FUNCTION public.get_revenue_by_dimension(
  p_user_id uuid, 
  p_start_date date, 
  p_end_date date, 
  p_dimension text
)
RETURNS TABLE(dimension_name text, total_amount numeric, transaction_count integer, percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND ft.type IN ('revenue', 'income', 'Entrada')
      AND COALESCE(ft.reconciled, false) = true
      AND NOT COALESCE(ft.is_void, false)
      AND COALESCE(ft.status, 'pending') != 'ignored'
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
$function$;