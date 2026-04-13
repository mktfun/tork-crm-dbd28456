-- =====================================================
-- CAMADA DE ABSTRAÇÃO CONTÁBIL (Accounting Abstraction Layer)
-- =====================================================
-- Objetivo: Padronizar TODAS as RPCs de leitura para focar no
-- IMPACTO NO RESULTADO, ignorando a estrutura do ledger.
--
-- CAUSA RAIZ IDENTIFICADA:
--   create_financial_movement_v2 grava status = 'confirmed'
--   MAS todas as RPCs de leitura filtram status = 'completed'
--   Resultado: transações novas ficam INVISÍVEIS em todos os relatórios.
--
-- CORREÇÕES:
--   1. Normalizar status: WHERE status IN ('completed', 'confirmed')
--   2. Usar ABS(amount) + tipo da conta (revenue/expense) como critério
--   3. Usar transaction_date (não payment_date que não existe)
--   4. Manter compatibilidade JSON com o frontend existente
-- =====================================================

-- =====================================================
-- 1. FIX: get_financial_summary (Dashboard KPIs)
-- =====================================================
-- Mantém RETURNS JSON para compatibilidade com o frontend
-- (financialService.ts espera { totalIncome, totalExpense, ... })

CREATE OR REPLACE FUNCTION get_financial_summary(p_start_date DATE, p_end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_income NUMERIC := 0;
  v_total_expense NUMERIC := 0;
  v_pending_income NUMERIC := 0;
  v_pending_expense NUMERIC := 0;
  v_completed_count INT := 0;
  v_pending_count INT := 0;
  v_cash_balance NUMERIC := 0;
  v_bank_balance NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();

  -- ============================================
  -- RECEITAS EFETIVADAS (status = completed OU confirmed)
  -- Lógica: Soma ABS(amount) de contas tipo 'revenue'
  -- ============================================
  SELECT COALESCE(SUM(ABS(fl.amount)), 0)
  INTO v_total_income
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  JOIN financial_transactions ft ON ft.id = fl.transaction_id
  WHERE ft.user_id = v_user_id
    AND fa.type = 'revenue'
    AND COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')
    AND NOT COALESCE(ft.is_void, false)
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date;

  -- ============================================
  -- DESPESAS EFETIVADAS
  -- ============================================
  SELECT COALESCE(SUM(ABS(fl.amount)), 0)
  INTO v_total_expense
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  JOIN financial_transactions ft ON ft.id = fl.transaction_id
  WHERE ft.user_id = v_user_id
    AND fa.type = 'expense'
    AND COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')
    AND NOT COALESCE(ft.is_void, false)
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date;

  -- ============================================
  -- A RECEBER (Pending Income) - usa due_date
  -- ============================================
  SELECT COALESCE(SUM(ABS(fl.amount)), 0)
  INTO v_pending_income
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  JOIN financial_transactions ft ON ft.id = fl.transaction_id
  WHERE ft.user_id = v_user_id
    AND fa.type = 'revenue'
    AND COALESCE(ft.status, 'pending') = 'pending'
    AND NOT COALESCE(ft.is_void, false)
    AND COALESCE(ft.due_date, ft.transaction_date) BETWEEN p_start_date AND p_end_date;

  -- ============================================
  -- A PAGAR (Pending Expense) - usa due_date
  -- ============================================
  SELECT COALESCE(SUM(ABS(fl.amount)), 0)
  INTO v_pending_expense
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  JOIN financial_transactions ft ON ft.id = fl.transaction_id
  WHERE ft.user_id = v_user_id
    AND fa.type = 'expense'
    AND COALESCE(ft.status, 'pending') = 'pending'
    AND NOT COALESCE(ft.is_void, false)
    AND COALESCE(ft.due_date, ft.transaction_date) BETWEEN p_start_date AND p_end_date;

  -- ============================================
  -- CONTAGENS
  -- ============================================
  SELECT COUNT(*) INTO v_completed_count
  FROM financial_transactions
  WHERE user_id = v_user_id
    AND status IN ('completed', 'confirmed')
    AND NOT COALESCE(is_void, false)
    AND transaction_date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*) INTO v_pending_count
  FROM financial_transactions
  WHERE user_id = v_user_id
    AND COALESCE(status, 'pending') = 'pending'
    AND NOT COALESCE(is_void, false)
    AND COALESCE(due_date, transaction_date) BETWEEN p_start_date AND p_end_date;

  -- ============================================
  -- SALDO: financial_accounts (asset) + bank_accounts
  -- ============================================
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_balance
  FROM financial_accounts
  WHERE user_id = v_user_id AND type = 'asset';

  SELECT COALESCE(SUM(current_balance), 0) INTO v_bank_balance
  FROM bank_accounts
  WHERE user_id = v_user_id AND status = 'active';

  v_cash_balance := v_cash_balance + v_bank_balance;

  -- ============================================
  -- RETORNO JSON (compatível com frontend)
  -- ============================================
  RETURN JSON_BUILD_OBJECT(
    'totalIncome', v_total_income,
    'totalExpense', v_total_expense,
    'netResult', v_total_income - v_total_expense,
    'pendingIncome', v_pending_income,
    'pendingExpense', v_pending_expense,
    'completedTransactionCount', v_completed_count,
    'pendingTransactionCount', v_pending_count,
    'transactionCount', v_completed_count + v_pending_count,
    'cashBalance', v_cash_balance,
    'periodStart', p_start_date,
    'periodEnd', p_end_date
  );
END;
$$;


-- =====================================================
-- 2. FIX: get_cash_flow_data (Fluxo de Caixa)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_cash_flow_data(date, date, text);

CREATE OR REPLACE FUNCTION public.get_cash_flow_data(
  p_start_date date,
  p_end_date date,
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE(period text, income numeric, expense numeric, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    FROM generate_series(p_start_date::timestamp, p_end_date::timestamp,
      CASE p_granularity WHEN 'month' THEN '1 month'::interval ELSE '1 day'::interval END
    ) d
  ),
  ledger_data AS (
    SELECT
      CASE p_granularity
        WHEN 'month' THEN TO_CHAR(ft.transaction_date, 'YYYY-MM')
        ELSE TO_CHAR(ft.transaction_date, 'YYYY-MM-DD')
      END AS period_key,
      fa.type AS account_type,
      fl.amount
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = v_user_id
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(ft.is_void, false)
      AND COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')
      AND fa.type IN ('revenue', 'expense')
  ),
  aggregated AS (
    SELECT
      period_key,
      COALESCE(SUM(CASE WHEN account_type = 'revenue' THEN ABS(amount) ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN account_type = 'expense' THEN ABS(amount) ELSE 0 END), 0) as expense
    FROM ledger_data
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
$$;


-- =====================================================
-- 3. FIX: get_revenue_transactions (Lista de Receitas)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_revenue_transactions(date, date, integer);

CREATE OR REPLACE FUNCTION public.get_revenue_transactions(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  description text,
  transaction_date date,
  amount numeric,
  account_name text,
  is_confirmed boolean,
  legacy_status text,
  client_name text,
  policy_number text,
  related_entity_id uuid,
  related_entity_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.description,
    ft.transaction_date,
    -- Valor absoluto da conta de receita
    COALESCE(
      (SELECT SUM(ABS(fl.amount)) FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'),
      0
    ) AS amount,
    -- Nome da categoria de receita
    (SELECT fa.name FROM financial_ledger fl
     JOIN financial_accounts fa ON fa.id = fl.account_id
     WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
     LIMIT 1) AS account_name,
    -- FIX: aceitar tanto 'completed' quanto 'confirmed'
    (COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')) AS is_confirmed,
    NULL::text AS legacy_status,
    NULL::text AS client_name,
    NULL::text AS policy_number,
    ft.related_entity_id,
    ft.related_entity_type
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    -- Tem lançamento em conta de receita
    AND EXISTS (
      SELECT 1 FROM financial_ledger fl
      JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
    )
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
  ORDER BY
    ft.transaction_date DESC,
    ft.created_at DESC
  LIMIT p_limit;
END;
$$;


-- =====================================================
-- 4. FIX: get_revenue_totals (KPI Recebido no Período)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_revenue_totals(date, date);

CREATE OR REPLACE FUNCTION public.get_revenue_totals(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(financial_total numeric, legacy_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ABS(fl.amount)), 0) AS financial_total,
    0::numeric AS legacy_total
  FROM financial_ledger fl
  JOIN financial_accounts fa ON fa.id = fl.account_id
  JOIN financial_transactions ft ON ft.id = fl.transaction_id
  WHERE ft.user_id = v_user_id
    AND fa.type = 'revenue'
    AND COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')
    AND NOT COALESCE(ft.is_void, false)
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date;
END;
$$;


-- =====================================================
-- 5. FIX: get_bank_account_statement (Extrato Bancário)
-- =====================================================
CREATE OR REPLACE FUNCTION get_bank_account_statement(p_bank_account_id UUID)
RETURNS TABLE (
  transaction_id UUID,
  description TEXT,
  transaction_date DATE,
  amount NUMERIC,
  category TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
    ft.id AS transaction_id,
    ft.description,
    ft.transaction_date,
    -- Calcular impacto no banco: inverso da soma do ledger
    -- Receita (-100 no ledger) -> +100 no banco
    -- Despesa (+50 no ledger) -> -50 no banco
    (0 - COALESCE(
      (SELECT SUM(fl.amount) FROM financial_ledger fl WHERE fl.transaction_id = ft.id),
      0
    )) AS amount,
    -- Categoria: nome da conta de resultado
    COALESCE(
      (SELECT fa.name FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id
       AND fa.type IN ('revenue', 'expense')
       LIMIT 1),
      'Sem Categoria'
    ) AS category,
    ft.status,
    ft.created_at
  FROM financial_transactions ft
  WHERE ft.bank_account_id = p_bank_account_id
    AND ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
  ORDER BY ft.transaction_date DESC, ft.created_at DESC;
END;
$$;


-- =====================================================
-- 6. FIX: get_recent_financial_transactions
-- =====================================================
-- Atualizar para calcular total_amount corretamente
CREATE OR REPLACE FUNCTION public.get_recent_financial_transactions(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  description text,
  transaction_date date,
  reference_number text,
  created_at timestamptz,
  is_void boolean,
  total_amount numeric,
  account_names text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.description,
    ft.transaction_date,
    ft.reference_number,
    ft.created_at,
    ft.is_void,
    -- Total: soma ABS dos lançamentos de resultado (revenue+expense)
    COALESCE(
      (SELECT SUM(ABS(fl.amount))
       FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id
       AND fa.type IN ('revenue', 'expense')),
      0
    ) AS total_amount,
    -- Nomes das contas de resultado
    COALESCE(
      (SELECT string_agg(DISTINCT fa.name, ', ')
       FROM financial_ledger fl
       JOIN financial_accounts fa ON fa.id = fl.account_id
       WHERE fl.transaction_id = ft.id
       AND fa.type IN ('revenue', 'expense')),
      'Sem Categoria'
    ) AS account_names,
    ft.status
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    -- Filtro por tipo (opcional)
    AND (
      p_type IS NULL
      OR (p_type = 'revenue' AND EXISTS (
        SELECT 1 FROM financial_ledger fl
        JOIN financial_accounts fa ON fa.id = fl.account_id
        WHERE fl.transaction_id = ft.id AND fa.type = 'revenue'
      ))
      OR (p_type = 'expense' AND EXISTS (
        SELECT 1 FROM financial_ledger fl
        JOIN financial_accounts fa ON fa.id = fl.account_id
        WHERE fl.transaction_id = ft.id AND fa.type = 'expense'
      ))
    )
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
