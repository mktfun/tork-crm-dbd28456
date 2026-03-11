-- Fix entity_name in get_payable_receivable_transactions to show "Cliente - Item Segurado"
CREATE OR REPLACE FUNCTION get_payable_receivable_transactions(
  p_user_id UUID,
  p_transaction_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  transaction_type TEXT,
  due_date DATE,
  entity_name TEXT,
  description TEXT,
  amount NUMERIC,
  status TEXT,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id as transaction_id,
    CASE 
      WHEN fa.type = 'revenue' THEN 'receber'::TEXT
      ELSE 'pagar'::TEXT
    END as transaction_type,
    ft.transaction_date as due_date,
    COALESCE(
      CASE 
        WHEN c_apolice.name IS NOT NULL AND a.insured_asset IS NOT NULL 
          THEN (c_apolice.name || ' - ' || a.insured_asset)
        WHEN c_apolice.name IS NOT NULL 
          THEN c_apolice.name
        ELSE NULL
      END,
      CASE 
        WHEN c_trans.name IS NOT NULL AND t_apolice.insured_asset IS NOT NULL
          THEN (c_trans.name || ' - ' || t_apolice.insured_asset)
        WHEN c_trans.name IS NOT NULL
          THEN c_trans.name
        ELSE NULL
      END,
      comp.name,
      fa.name,
      'Não especificado'
    )::TEXT as entity_name,
    ft.description,
    ABS(fl.amount) as amount,
    CASE 
      WHEN ft.is_confirmed THEN 'pago'::TEXT
      WHEN ft.transaction_date < CURRENT_DATE THEN 'atrasado'::TEXT
      ELSE 'pendente'::TEXT
    END as status,
    CASE 
      WHEN ft.transaction_date < CURRENT_DATE AND NOT ft.is_confirmed 
      THEN (CURRENT_DATE - ft.transaction_date)::INTEGER
      ELSE 0
    END as days_overdue
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN transactions t ON t.id = ft.related_entity_id AND ft.related_entity_type = 'transaction'
  LEFT JOIN clientes c_trans ON c_trans.id = t.client_id
  LEFT JOIN apolices t_apolice ON t_apolice.id = t.policy_id
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  LEFT JOIN clientes c_apolice ON c_apolice.id = a.client_id
  LEFT JOIN companies comp ON comp.id = COALESCE(a.insurance_company, ft.insurance_company_id)
  WHERE ft.user_id = p_user_id
    AND NOT ft.is_void
    AND COALESCE(ft.archived, false) = false
    AND fa.type IN ('revenue', 'expense')
    AND (
      (fa.type = 'revenue' AND fl.amount < 0)
      OR (fa.type = 'expense' AND fl.amount > 0)
    )
    AND (
      p_transaction_type IS NULL
      OR (p_transaction_type = 'receber' AND fa.type = 'revenue')
      OR (p_transaction_type = 'pagar' AND fa.type = 'expense')
    )
    AND (
      p_status IS NULL
      OR (p_status = 'pago' AND ft.is_confirmed)
      OR (p_status = 'atrasado' AND NOT ft.is_confirmed AND ft.transaction_date < CURRENT_DATE)
      OR (p_status = 'pendente' AND NOT ft.is_confirmed AND ft.transaction_date >= CURRENT_DATE)
    )
  ORDER BY 
    CASE WHEN NOT ft.is_confirmed AND ft.transaction_date < CURRENT_DATE THEN 0 ELSE 1 END,
    ft.transaction_date DESC;
END;
$$;

-- Fix entity_name in get_upcoming_receivables to show "Cliente - Item Segurado"
CREATE OR REPLACE FUNCTION get_upcoming_receivables(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  transaction_id UUID,
  due_date DATE,
  entity_name TEXT,
  description TEXT,
  amount NUMERIC,
  days_until_due INTEGER,
  related_entity_type TEXT,
  related_entity_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id as transaction_id,
    ft.transaction_date as due_date,
    COALESCE(
      CASE 
        WHEN c_policy.name IS NOT NULL AND a.insured_asset IS NOT NULL 
          THEN (c_policy.name || ' - ' || a.insured_asset)
        WHEN c_policy.name IS NOT NULL 
          THEN c_policy.name
        ELSE NULL
      END,
      CASE 
        WHEN c_trans.name IS NOT NULL AND t_apolice.insured_asset IS NOT NULL
          THEN (c_trans.name || ' - ' || t_apolice.insured_asset)
        WHEN c_trans.name IS NOT NULL
          THEN c_trans.name
        ELSE NULL
      END,
      comp.name,
      ft.description,
      'Cliente Desconhecido'
    )::TEXT as entity_name,
    ft.description,
    ABS(fl.amount) as amount,
    (ft.transaction_date - CURRENT_DATE)::INTEGER as days_until_due,
    ft.related_entity_type,
    ft.related_entity_id
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN transactions t ON t.id = ft.related_entity_id AND ft.related_entity_type = 'transaction'
  LEFT JOIN clientes c_trans ON c_trans.id = t.client_id
  LEFT JOIN apolices t_apolice ON t_apolice.id = t.policy_id
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  LEFT JOIN clientes c_policy ON c_policy.id = a.client_id
  LEFT JOIN companies comp ON comp.id = COALESCE(a.insurance_company, ft.insurance_company_id)
  WHERE ft.user_id = p_user_id
    AND fa.type = 'revenue'
    AND NOT ft.is_confirmed
    AND NOT ft.is_void
    AND COALESCE(ft.archived, false) = false
    AND fl.amount < 0
    AND ft.transaction_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
  ORDER BY ft.transaction_date ASC;
END;
$$;