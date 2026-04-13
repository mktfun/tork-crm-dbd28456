-- 3.1: Ajustar get_goal_vs_actual para contar receitas lançadas (não anuladas), independente da conciliação
DROP FUNCTION IF EXISTS get_goal_vs_actual(integer, integer, uuid, text);

CREATE OR REPLACE FUNCTION get_goal_vs_actual(
  p_year integer,
  p_month integer,
  p_user_id uuid,
  p_goal_type text DEFAULT 'revenue'
)
RETURNS TABLE(
  goal_id uuid,
  goal_amount numeric,
  actual_amount numeric,
  difference numeric,
  percentage_achieved numeric,
  status text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal_amount NUMERIC := 0;
  v_actual_amount NUMERIC := 0;
  v_goal_id UUID;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Definir datas de início e fim do mês
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  -- Buscar a meta
  SELECT id, goal_amount INTO v_goal_id, v_goal_amount
  FROM financial_goals
  WHERE user_id = p_user_id
    AND year = p_year
    AND month = p_month
    AND goal_type = p_goal_type;

  -- Se não existir meta, retorna vazio ou zeros (aqui optamos por retornar zeros se não tiver meta, mas estrutura pede goal_id)
  -- Se goal_id for null, retornaremos null
  
  -- Calcular o realizado
  -- Lógica ajustada: Contar todas as transações de receita do período que NÃO são estornadas (is_void)
  -- Removida a restrição AND ft.reconciled = true
  SELECT COALESCE(SUM(ABS(ft.total_amount)), 0) INTO v_actual_amount
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = p_user_id
    AND fa.type = 'revenue'
    AND ft.transaction_date BETWEEN v_start_date AND v_end_date
    AND NOT COALESCE(ft.is_void, false); -- Apenas não anuladas

  -- Retornar
  RETURN QUERY SELECT
    v_goal_id,
    COALESCE(v_goal_amount, 0),
    v_actual_amount,
    v_actual_amount - COALESCE(v_goal_amount, 0),
    CASE 
      WHEN COALESCE(v_goal_amount, 0) > 0 THEN (v_actual_amount / v_goal_amount) * 100
      ELSE 0 
    END,
    CASE
      WHEN v_actual_amount >= COALESCE(v_goal_amount, 0) THEN 'achieved'
      WHEN v_actual_amount >= COALESCE(v_goal_amount, 0) * 0.8 THEN 'near'
      ELSE 'below'
    END;
END;
$$;

-- 3.3: Ajustar get_revenue_transactions para mostrar Nome do Banco real
DROP FUNCTION IF EXISTS get_revenue_transactions(date, date, integer);

CREATE OR REPLACE FUNCTION get_revenue_transactions(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  transaction_date date,
  description text,
  amount numeric, -- Valor positivo para revenue
  account_name text, -- Nome do Banco ou da conta contábil se não tiver banco
  category_name text, -- Adicionei para contexto extra se útil, ou mantemos schema antigo
  related_entity_type text,
  related_entity_id text,
  client_name text,
  policy_number text,
  is_confirmed boolean,
  legacy_status text,
  reconciled boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.transaction_date,
    ft.description,
    ABS(ft.total_amount) as amount,
    -- Prioridade: Nome do Banco > Nome da Conta Financeira
    COALESCE(ba.bank_name, fa.name) as account_name,
    'Receita' as category_name, -- Hardcoded ou poderia vir de tag
    ft.related_entity_type,
    ft.related_entity_id,
    -- Tentar buscar nome do cliente se for payment/commission
    COALESCE(c.name, cw.name) as client_name,
    ap.policy_number,
    ft.is_confirmed,
    ft.legacy_status,
    ft.reconciled
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id -- JOIN com contas bancárias
  LEFT JOIN apolices ap ON (ft.related_entity_type = 'policy' AND ft.related_entity_id::text = ap.id::text)
  LEFT JOIN clientes c ON ap.client_id = c.id
  LEFT JOIN clients_with_stats cw ON (ft.related_entity_type = 'client' AND ft.related_entity_id::text = cw.id::text)
  WHERE ft.user_id = auth.uid()
    AND fa.type = 'revenue'
    AND NOT COALESCE(ft.is_void, false)
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
  ORDER BY ft.transaction_date DESC
  LIMIT p_limit;
END;
$$;
