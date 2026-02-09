-- HOTFIX: Fix COALESCE type mismatch in get_upcoming_receivables
-- Problem: COALESCE(t.client_id, a.client_id) failed because one was seen as text
-- Solution: Use separate OR conditions in the JOIN instead of COALESCE

DROP FUNCTION IF EXISTS get_upcoming_receivables(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_upcoming_receivables(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  transaction_id UUID,
  due_date DATE,
  entity_name TEXT,
  description TEXT,
  amount DECIMAL,
  days_until_due INTEGER,
  related_entity_type TEXT,
  related_entity_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id as transaction_id,
    ft.transaction_date as due_date,
    COALESCE(
      c_trans.name,   -- Cliente da transação legada
      c_policy.name,  -- Cliente da apólice
      ft.description, -- Fallback: descrição
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
  -- Join com transação legada E seu cliente
  LEFT JOIN transactions t ON t.id = ft.related_entity_id AND ft.related_entity_type = 'transaction'
  LEFT JOIN clientes c_trans ON c_trans.id = t.client_id
  -- Join com apólice E seu cliente
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  LEFT JOIN clientes c_policy ON c_policy.id = a.client_id
  WHERE ft.user_id = p_user_id
    AND fa.type = 'revenue'
    AND NOT ft.is_confirmed
    AND NOT ft.is_void
    AND fl.amount < 0
    AND ft.transaction_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
  ORDER BY ft.transaction_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix get_payable_receivable_transactions with same pattern
DROP FUNCTION IF EXISTS get_payable_receivable_transactions(UUID, TEXT, TEXT);

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
      c_trans.name,
      c_policy.name,
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
  -- Join com transação legada E seu cliente
  LEFT JOIN transactions t ON t.id = ft.related_entity_id AND ft.related_entity_type = 'transaction'
  LEFT JOIN clientes c_trans ON c_trans.id = t.client_id
  -- Join com apólice E seu cliente
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  LEFT JOIN clientes c_policy ON c_policy.id = a.client_id
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

-- Also fix get_aging_report
DROP FUNCTION IF EXISTS get_aging_report(UUID, DATE);

CREATE OR REPLACE FUNCTION get_aging_report(
  p_user_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  bucket_range TEXT,
  bucket_amount DECIMAL,
  bucket_count INTEGER,
  bucket_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH overdue_transactions AS (
    SELECT 
      ft.id,
      ft.transaction_date,
      ABS(fl.amount) as amount,
      CASE 
        WHEN ft.transaction_date >= p_reference_date THEN 0
        ELSE (p_reference_date - ft.transaction_date)::INTEGER
      END as days_overdue
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = p_user_id
      AND fa.type = 'revenue'
      AND NOT ft.is_confirmed
      AND NOT ft.is_void
      AND fl.amount < 0
      AND ft.transaction_date < p_reference_date
  )
  SELECT 
    CASE 
      WHEN ot.days_overdue <= 5 THEN '0-5 dias'
      WHEN ot.days_overdue <= 15 THEN '6-15 dias'
      WHEN ot.days_overdue <= 30 THEN '16-30 dias'
      WHEN ot.days_overdue <= 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END as range_label,
    SUM(ot.amount) as total_amount,
    COUNT(*)::INTEGER as transaction_count,
    CASE 
      WHEN ot.days_overdue <= 5 THEN '#FCD34D'
      WHEN ot.days_overdue <= 15 THEN '#FB923C'
      WHEN ot.days_overdue <= 30 THEN '#F87171'
      WHEN ot.days_overdue <= 60 THEN '#EF4444'
      ELSE '#DC2626'
    END as color
  FROM overdue_transactions ot
  GROUP BY 
    CASE 
      WHEN ot.days_overdue <= 5 THEN '0-5 dias'
      WHEN ot.days_overdue <= 15 THEN '6-15 dias'
      WHEN ot.days_overdue <= 30 THEN '16-30 dias'
      WHEN ot.days_overdue <= 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END,
    CASE 
      WHEN ot.days_overdue <= 5 THEN '#FCD34D'
      WHEN ot.days_overdue <= 15 THEN '#FB923C'
      WHEN ot.days_overdue <= 30 THEN '#F87171'
      WHEN ot.days_overdue <= 60 THEN '#EF4444'
      ELSE '#DC2626'
    END
  ORDER BY MIN(ot.days_overdue);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
