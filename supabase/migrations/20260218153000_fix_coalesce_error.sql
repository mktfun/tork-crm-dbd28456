-- Migration: Fix COALESCE types text and uuid error
-- Problem: "COALESCE types text and uuid cannot be matched"
-- Solution: Cast all arguments in COALESCE to TEXT explicitly.

CREATE OR REPLACE FUNCTION get_payable_receivable_transactions(
  p_user_id UUID,
  p_transaction_type TEXT DEFAULT NULL, -- 'receber', 'pagar', or NULL for all
  p_status TEXT DEFAULT NULL -- 'atrasado', 'pendente', 'pago', or NULL for all
)
RETURNS TABLE (
  transaction_id UUID,
  transaction_type TEXT,
  due_date DATE,
  entity_name TEXT,
  description TEXT,
  amount DECIMAL,
  status TEXT,
  days_overdue INTEGER
) AS $$
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
      -- Explicit casts to ensure everything is TEXT
      c_trans.name::TEXT,
      c_apolice.name::TEXT,
      a.insurance_company::TEXT,
      fa.name::TEXT,
      'Não especificado'::TEXT
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
  
  -- Join com tabela legada transactions
  LEFT JOIN transactions t ON t.id = ft.related_entity_id AND ft.related_entity_type = 'transaction'
  LEFT JOIN clientes c_trans ON c_trans.id = t.client_id
  
  -- Join com apolices
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  LEFT JOIN clientes c_apolice ON c_apolice.id = a.client_id
  
  WHERE ft.user_id = p_user_id
    AND NOT ft.is_void
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
