-- Função para análise de receitas por dimensão (produtor, ramo, seguradora)
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
      ft.transaction_date,
      fl.amount,
      a.user_id as producer_id,
      a.type as insurance_type,
      a.insurance_company,
      COALESCE(p.nome_completo, p.email) as producer_name
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
    LEFT JOIN profiles p ON p.id = a.user_id
    WHERE ft.user_id = p_user_id
      AND fa.type = 'income'
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
  ),
  grand_total AS (
    SELECT COALESCE(SUM(total), 0) as gt FROM dimension_totals
  )
  SELECT 
    dt.dim_name::TEXT,
    dt.total,
    dt.count::INTEGER,
    CASE 
      WHEN gt.gt > 0 THEN ROUND((dt.total / gt.gt) * 100, 2)
      ELSE 0
    END as pct
  FROM dimension_totals dt
  CROSS JOIN grand_total gt
  WHERE dt.total > 0
  ORDER BY dt.total DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION get_revenue_by_dimension IS 
'Retorna análise de receitas por dimensão (produtor, ramo ou seguradora).
Usa user_id da apólice como produtor, type como ramo e insurance_company como seguradora.
Retorna top 10 por valor total.';
