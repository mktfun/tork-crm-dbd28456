-- Função para análise de receitas por dimensão (produtor, ramo, seguradora)
-- Atualizado para usar type='revenue' e tabela de producers correta

DROP FUNCTION IF EXISTS get_revenue_by_dimension(uuid,date,date,text);

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
DECLARE
  v_total_revenue DECIMAL;
BEGIN
  -- Calcular o total geral primeiro para a porcentagem
  SELECT COALESCE(SUM(fl.amount), 0)
  INTO v_total_revenue
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = p_user_id
    AND fa.type = 'revenue'
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND NOT ft.is_void
    AND fl.amount > 0;

  -- Se não houver receita, retornar vazio
  IF v_total_revenue = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH revenue_transactions AS (
    SELECT 
      ft.id,
      ft.transaction_date,
      fl.amount,
      a.producer_id,
      a.type as insurance_type,
      a.insurance_company,
      pr.name as producer_name
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
    LEFT JOIN producers pr ON pr.id = a.producer_id
    WHERE ft.user_id = p_user_id
      AND fa.type = 'revenue'
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT ft.is_void
      AND fl.amount > 0
  ),
  dimension_totals AS (
    SELECT 
      CASE 
        WHEN p_dimension = 'producer' THEN COALESCE(producer_name, 'Sem Produtor')
        WHEN p_dimension = 'type' THEN COALESCE(insurance_type, 'Sem Ramo')
        WHEN p_dimension = 'insurance_company' THEN COALESCE(insurance_company, 'Sem Seguradora')
        ELSE 'Desconhecido'
      END as dim_name,
      SUM(amount) as total,
      COUNT(DISTINCT id) as count
    FROM revenue_transactions
    GROUP BY dim_name
  )
  SELECT 
    dt.dim_name::TEXT,
    dt.total,
    dt.count::INTEGER,
    CASE 
      WHEN v_total_revenue > 0 THEN ROUND((dt.total / v_total_revenue) * 100, 2)
      ELSE 0
    END as pct
  FROM dimension_totals dt
  WHERE dt.total > 0
  ORDER BY dt.total DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION get_revenue_by_dimension IS 
'Retorna análise de receitas por dimensão (produtor, ramo ou seguradora).
Corrige filtro para type=revenue e usa tabela producers para nome do produtor.';
