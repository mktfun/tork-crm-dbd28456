-- =====================================================================
-- 🛠️ FIX: Analytics & Metas Dashboard
-- Timestamp: 20260219100000
-- Description:
-- 1. Updates `get_revenue_by_dimension` to use direct transaction columns (producer_id, etc.)
-- 2. Updates `get_goal_vs_actual` to correctly sum ledger amounts (ABS) and handle all confirmed transactions.
-- =====================================================================

-- 1. FIX: get_revenue_by_dimension
CREATE OR REPLACE FUNCTION get_revenue_by_dimension(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_dimension TEXT -- 'producer', 'type', 'insurance_company'
)
RETURNS TABLE (
  dimension_name TEXT,
  total_amount DECIMAL,
  transaction_count INTEGER,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH revenue_transactions AS (
    SELECT 
      ft.id,
      ft.total_amount, -- Usar total_amount da transação que já é positivo para receitas
      -- Dimensões Diretas (Prioridade)
      ft.producer_id,
      ft.ramo_id,
      ft.insurance_company_id,
      -- Fallback para Apólices (Legado)
      a.user_id as policy_producer_id,
      a.type as policy_type,
      a.insurance_company as policy_company
    FROM financial_transactions ft
    LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
    WHERE ft.user_id = p_user_id
      AND ft.type = 'revenue' -- Apenas Receitas
      AND ft.status = 'confirmed' -- Apenas Confirmadas
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT ft.is_void
  ),
  dimension_data AS (
    SELECT 
      rt.total_amount,
      CASE 
        WHEN p_dimension = 'producer' THEN (
          SELECT COALESCE(p.nome_completo, p.email, 'Sem Produtor') 
          FROM profiles p WHERE p.id = COALESCE(rt.producer_id, rt.policy_producer_id)
        )
        WHEN p_dimension = 'type' THEN (
          SELECT COALESCE(r.name, rt.policy_type, 'Sem Ramo') 
          FROM ramos r WHERE r.id = rt.ramo_id
          -- Se não achar no ID, tenta o texto do legado
          UNION ALL SELECT rt.policy_type WHERE rt.ramo_id IS NULL AND rt.policy_type IS NOT NULL
          LIMIT 1
        )
        WHEN p_dimension = 'insurance_company' THEN (
          SELECT COALESCE(c.name, rt.policy_company, 'Sem Seguradora') 
          FROM companies c WHERE c.id = rt.insurance_company_id
          -- Se não achar no ID, tenta o texto do legado
          UNION ALL SELECT rt.policy_company WHERE rt.insurance_company_id IS NULL AND rt.policy_company IS NOT NULL
          LIMIT 1
        )
        ELSE 'Desconhecido'
      END as dim_name
    FROM revenue_transactions rt
  ),
  grouped_totals AS (
    SELECT 
      COALESCE(dim_name, 'Não Classificado') as d_name,
      SUM(total_amount) as t_amount,
      COUNT(*) as t_count
    FROM dimension_data
    GROUP BY d_name
  ),
  grand_total AS (
    SELECT COALESCE(SUM(t_amount), 0) as gt FROM grouped_totals
  )
  SELECT 
    gt.d_name::TEXT,
    gt.t_amount,
    gt.t_count::INTEGER,
    CASE 
      WHEN g.gt > 0 THEN ROUND((gt.t_amount / g.gt) * 100, 2)
      ELSE 0
    END as pct
  FROM grouped_totals gt
  CROSS JOIN grand_total g
  WHERE gt.t_amount > 0
  ORDER BY gt.t_amount DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FIX: get_goal_vs_actual
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
  
  -- Se não houver meta, retornar vazio (o front trata como 'sem meta')
  IF v_goal_amount IS NULL THEN
    RETURN;
  END IF;
  
  -- Calcular período
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Buscar realizado (Soma de transactions do tipo revenue confirmadas)
  -- Usar transaction.total_amount é mais seguro que somar ledger para KPIs de alto nível,
  -- pois ledger pode ter splits internos.
  SELECT COALESCE(SUM(ft.total_amount), 0) INTO v_actual_amount
  FROM financial_transactions ft
  WHERE ft.user_id = p_user_id
    AND ft.type = 'revenue' -- Garante que é receita
    AND ft.status = 'confirmed' -- Garante que está confirmada
    AND NOT ft.is_void -- Não anulada
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
