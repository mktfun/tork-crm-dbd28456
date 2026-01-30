-- Função para relatório de aging (análise de vencimentos)
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
      ft.due_date,
      fl.amount,
      CASE 
        WHEN ft.due_date >= p_reference_date THEN 0
        ELSE p_reference_date - ft.due_date
      END as days_overdue
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = p_user_id
      AND fa.account_type = 'income'
      AND ft.status = 'pending'
      AND NOT ft.is_void
      AND fl.amount > 0
      AND ft.due_date < p_reference_date
  )
  SELECT 
    CASE 
      WHEN days_overdue <= 5 THEN '0-5 dias'
      WHEN days_overdue <= 15 THEN '6-15 dias'
      WHEN days_overdue <= 30 THEN '16-30 dias'
      WHEN days_overdue <= 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END as range_label,
    SUM(amount) as total_amount,
    COUNT(*)::INTEGER as transaction_count,
    CASE 
      WHEN days_overdue <= 5 THEN '#FCD34D'
      WHEN days_overdue <= 15 THEN '#FB923C'
      WHEN days_overdue <= 30 THEN '#F87171'
      WHEN days_overdue <= 60 THEN '#EF4444'
      ELSE '#DC2626'
    END as color
  FROM overdue_transactions
  GROUP BY 
    CASE 
      WHEN days_overdue <= 5 THEN '0-5 dias'
      WHEN days_overdue <= 15 THEN '6-15 dias'
      WHEN days_overdue <= 30 THEN '16-30 dias'
      WHEN days_overdue <= 60 THEN '31-60 dias'
      ELSE '60+ dias'
    END,
    CASE 
      WHEN days_overdue <= 5 THEN '#FCD34D'
      WHEN days_overdue <= 15 THEN '#FB923C'
      WHEN days_overdue <= 30 THEN '#F87171'
      WHEN days_overdue <= 60 THEN '#EF4444'
      ELSE '#DC2626'
    END
  ORDER BY 
    CASE 
      WHEN days_overdue <= 5 THEN 1
      WHEN days_overdue <= 15 THEN 2
      WHEN days_overdue <= 30 THEN 3
      WHEN days_overdue <= 60 THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar recebíveis próximos ao vencimento
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
    ft.id,
    ft.due_date,
    COALESCE(
      CASE 
        WHEN ft.related_entity_type = 'policy' THEN a.insurance_company
        ELSE ft.description
      END,
      'Não especificado'
    ) as entity,
    ft.description,
    fl.amount,
    (ft.due_date - CURRENT_DATE)::INTEGER as days_until,
    ft.related_entity_type,
    ft.related_entity_id
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  WHERE ft.user_id = p_user_id
    AND fa.account_type = 'income'
    AND ft.status = 'pending'
    AND NOT ft.is_void
    AND fl.amount > 0
    AND ft.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
  ORDER BY ft.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar transações a pagar e receber com filtros
CREATE OR REPLACE FUNCTION get_payable_receivable_transactions(
  p_user_id UUID,
  p_transaction_type TEXT DEFAULT 'all', -- 'all', 'receivable', 'payable'
  p_status TEXT DEFAULT 'all' -- 'all', 'overdue', 'pending', 'paid'
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
    ft.id,
    CASE 
      WHEN fa.account_type = 'income' THEN 'receber'
      ELSE 'pagar'
    END as tx_type,
    ft.due_date,
    COALESCE(
      CASE 
        WHEN ft.related_entity_type = 'policy' THEN a.insurance_company
        ELSE ft.description
      END,
      'Não especificado'
    ) as entity,
    ft.description,
    fl.amount,
    CASE 
      WHEN ft.status = 'confirmed' THEN 'pago'
      WHEN ft.due_date < CURRENT_DATE THEN 'atrasado'
      ELSE 'pendente'
    END as tx_status,
    CASE 
      WHEN ft.due_date < CURRENT_DATE AND ft.status = 'pending' 
      THEN (CURRENT_DATE - ft.due_date)::INTEGER
      ELSE 0
    END as overdue_days
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN apolices a ON a.id = ft.related_entity_id AND ft.related_entity_type = 'policy'
  WHERE ft.user_id = p_user_id
    AND NOT ft.is_void
    AND (
      p_transaction_type = 'all' 
      OR (p_transaction_type = 'receivable' AND fa.account_type = 'income')
      OR (p_transaction_type = 'payable' AND fa.account_type = 'expense')
    )
    AND (
      p_status = 'all'
      OR (p_status = 'paid' AND ft.status = 'confirmed')
      OR (p_status = 'overdue' AND ft.status = 'pending' AND ft.due_date < CURRENT_DATE)
      OR (p_status = 'pending' AND ft.status = 'pending' AND ft.due_date >= CURRENT_DATE)
    )
  ORDER BY 
    CASE WHEN ft.status = 'pending' AND ft.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
    ft.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION get_aging_report IS 
'Retorna relatório de aging (análise de vencimentos) agrupado por faixas de dias em atraso.
Analisa apenas receitas pendentes vencidas.';

COMMENT ON FUNCTION get_upcoming_receivables IS 
'Retorna lista de recebíveis com vencimento nos próximos N dias.
Útil para gestão de fluxo de caixa e previsão de recebimentos.';

COMMENT ON FUNCTION get_payable_receivable_transactions IS 
'Retorna transações a pagar e receber com filtros por tipo e status.
Suporta filtros: tipo (receber/pagar/todos) e status (atrasado/pendente/pago/todos).';
