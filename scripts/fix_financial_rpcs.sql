-- ==============================================================================
-- FIX FINANCIAL RPCS - TORK CRM
-- Data: 2026-02-05
-- Descrição: Cria/Atualiza funções RPC para análise financeira real.
-- ==============================================================================

-- 1. GET_REVENUE_BY_DIMENSION
-- Análise de faturamento por dimensão (Produtor, Seguradora, Tipo)
DROP FUNCTION IF EXISTS get_revenue_by_dimension(uuid,date,date,text);

CREATE OR REPLACE FUNCTION get_revenue_by_dimension(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_dimension TEXT
)
RETURNS TABLE (
  dimension_value TEXT,
  total_revenue NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      CASE
        WHEN p_dimension = 'producer' THEN p.name
        WHEN p_dimension = 'insurance_company' THEN c.name
        WHEN p_dimension = 'type' THEN r.nome
        ELSE 'Não identificado'
      END,
      'Não identificado'
    )::TEXT as dimension_value,
    ABS(COALESCE(SUM(fl.amount), 0)) as total_revenue, -- Valor absoluto
    COUNT(DISTINCT ft.id) as transaction_count
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN apolices ap ON (ft.related_entity_type = 'policy' AND ft.related_entity_id = ap.id)
  LEFT JOIN producers p ON ap.producer_id = p.id
  LEFT JOIN companies c ON ap.insurance_company = c.id
  LEFT JOIN ramos r ON ap.ramo_id = r.id
  WHERE
    ft.user_id = p_user_id
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.status = 'completed'
    AND fa.type = 'revenue'
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;

-- 2. GET_AGING_REPORT
-- Relatório de inadimplência/recebíveis por faixa de atraso
DROP FUNCTION IF EXISTS get_aging_report(uuid);

CREATE OR REPLACE FUNCTION get_aging_report(
  p_user_id UUID
)
RETURNS TABLE (
  bucket_range TEXT,
  bucket_amount NUMERIC,
  bucket_count BIGINT,
  bucket_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH aging_data AS (
    SELECT
      id,
      CURRENT_DATE - transaction_date::DATE as days_overdue,
      (
        SELECT fl.amount 
        FROM financial_ledger fl 
        JOIN financial_accounts fa ON fl.account_id = fa.id
        WHERE fl.transaction_id = ft.id AND fa.type = 'asset'
        LIMIT 1
      ) as amount
    FROM financial_transactions ft
    WHERE
      ft.user_id = p_user_id
      AND ft.status = 'pending'
      AND ft.transaction_date < CURRENT_DATE
  )
  SELECT
    bucket_label::TEXT as bucket_range,
    COALESCE(SUM(amount), 0) as bucket_amount,
    COUNT(*) as bucket_count,
    bucket_color_code::TEXT as bucket_color
  FROM (
    SELECT
      amount,
      CASE
        WHEN days_overdue <= 30 THEN '0-30 dias'
        WHEN days_overdue <= 60 THEN '31-60 dias'
        WHEN days_overdue <= 90 THEN '61-90 dias'
        ELSE 'Acima de 90 dias'
      END as bucket_label,
      CASE
        WHEN days_overdue <= 30 THEN 'hsl(var(--chart-1))'
        WHEN days_overdue <= 60 THEN 'hsl(var(--chart-2))'
        WHEN days_overdue <= 90 THEN 'hsl(var(--chart-3))'
        ELSE 'hsl(var(--chart-4))'
      END as bucket_color_code
    FROM aging_data
  ) buckets
  GROUP BY bucket_label, bucket_color_code
  ORDER BY bucket_label;
END;
$$;

-- 3. GET_UPCOMING_RECEIVABLES
-- Recebimentos futuros (próximos 30 dias)
DROP FUNCTION IF EXISTS get_upcoming_receivables(uuid,int);

CREATE OR REPLACE FUNCTION get_upcoming_receivables(
  p_user_id UUID,
  p_days_ahead INT DEFAULT 30
)
RETURNS TABLE (
  transaction_id UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  entity_name TEXT,
  description TEXT,
  amount NUMERIC,
  days_until_due INT,
  related_entity_type TEXT,
  related_entity_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id as transaction_id,
    ft.transaction_date::TIMESTAMP WITH TIME ZONE as due_date,
    COALESCE(
        (SELECT cl.name FROM clientes cl JOIN apolices ap ON ap.client_id = cl.id WHERE ap.id = ft.related_entity_id AND ft.related_entity_type = 'policy'),
        'Cliente Desconhecido'
    ) as entity_name,
    ft.description,
    (
        SELECT fl.amount 
        FROM financial_ledger fl 
        JOIN financial_accounts fa ON fl.account_id = fa.id
        WHERE fl.transaction_id = ft.id AND fa.type = 'asset'
        LIMIT 1
    ) as amount,
    (ft.transaction_date::DATE - CURRENT_DATE)::INT as days_until_due,
    ft.related_entity_type,
    ft.related_entity_id
  FROM financial_transactions ft
  WHERE
    ft.user_id = p_user_id
    AND ft.status = 'pending'
    AND ft.transaction_date >= CURRENT_DATE
    AND ft.transaction_date <= (CURRENT_DATE + p_days_ahead)
  ORDER BY ft.transaction_date ASC;
END;
$$;

-- 4. GET_PENDING_TOTALS
DROP FUNCTION IF EXISTS get_pending_totals(uuid);

CREATE OR REPLACE FUNCTION get_pending_totals(p_user_id UUID)
RETURNS TABLE (
  total_receivables NUMERIC,
  total_payables NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (
      SELECT COALESCE(SUM(fl.amount), 0)
      FROM financial_transactions ft
      JOIN financial_ledger fl ON fl.transaction_id = ft.id
      JOIN financial_accounts fa ON fl.account_id = fa.id
      WHERE ft.user_id = p_user_id AND ft.status = 'pending' 
      AND fa.type = 'asset' -- 'Contas a Receber' geralmente é asset
    ) as total_receivables,
    (
      SELECT abs(COALESCE(SUM(fl.amount), 0))
      FROM financial_transactions ft
      JOIN financial_ledger fl ON fl.transaction_id = ft.id
      JOIN financial_accounts fa ON fl.account_id = fa.id
      WHERE ft.user_id = p_user_id AND ft.status = 'pending'
      AND fa.type = 'liability' -- 'Contas a Pagar' é liability
    ) as total_payables;
END;
$$;

-- 5. GET_FINANCIAL_SUMMARY
-- Resumo financeiro para KPIs (ModuloFaturamento)
DROP FUNCTION IF EXISTS get_financial_summary(date,date);

CREATE OR REPLACE FUNCTION get_financial_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_summary json;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_pending_income NUMERIC;
  v_pending_expense NUMERIC;
  v_count BIGINT;
BEGIN
  v_user_id := auth.uid();
  
  -- Calcular separadamente para não complicar a query única
  
  -- Income (Receita Confirmada): Ledger type 'revenue', status completed. Amount é negativo no ledger, usamos ABS.
  SELECT ABS(COALESCE(SUM(fl.amount), 0))
  INTO v_total_income
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fl.account_id = fa.id
  WHERE ft.user_id = v_user_id 
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.status = 'completed'
    AND fa.type = 'revenue';

  -- Expense (Despesa Confirmada): Ledger type 'expense', status completed. Amount é positivo no ledger (débito), mas queremos valor absoluto.
  SELECT ABS(COALESCE(SUM(fl.amount), 0))
  INTO v_total_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fl.account_id = fa.id
  WHERE ft.user_id = v_user_id 
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.status = 'completed'
    AND fa.type = 'expense';

  -- Pending Income (A Receber): Ledger type 'asset', status pending.
  SELECT COALESCE(SUM(fl.amount), 0)
  INTO v_pending_income
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fl.account_id = fa.id
  WHERE ft.user_id = v_user_id 
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.status = 'pending'
    AND fa.type = 'asset'
    AND fl.amount > 0; -- A receber é débito (positivo) no asset

  -- Pending Expense (A Pagar): Ledger type 'liability', status pending.
  SELECT ABS(COALESCE(SUM(fl.amount), 0))
  INTO v_pending_expense
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fl.account_id = fa.id
  WHERE ft.user_id = v_user_id 
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND ft.status = 'pending'
    AND fa.type = 'liability'
    AND fl.amount < 0; -- A pagar é crédito (negativo) no liability

  -- Transaction Count
  SELECT COUNT(DISTINCT id)
  INTO v_count
  FROM financial_transactions
  WHERE user_id = v_user_id
    AND transaction_date BETWEEN p_start_date AND p_end_date;

  SELECT json_build_object(
    'totalIncome', v_total_income,
    'totalExpense', v_total_expense,
    'netResult', (v_total_income - v_total_expense),
    'pendingIncome', v_pending_income,
    'pendingExpense', v_pending_expense,
    'transactionCount', v_count,
    'cashBalance', 0
  ) INTO v_summary;

  RETURN v_summary;
END;
$$;
