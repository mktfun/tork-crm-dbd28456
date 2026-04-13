-- =====================================================
-- FIX DEFINITIVO: TUDO EM UM SO ARQUIVO
-- Cole INTEIRO no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. get_dashboard_financial_kpis (KPI do Dashboard)
-- Aceita 'completed' E 'confirmed' + ABS(amount)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_financial_kpis(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_commission numeric;
  v_pending_commission numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Nao autenticado');
  END IF;

  SELECT COALESCE(SUM(ABS(fl.amount)), 0) INTO v_total_commission
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND COALESCE(ft.status, 'pending') IN ('completed', 'confirmed')
    AND fa.type = 'revenue'
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date);

  SELECT COALESCE(SUM(ABS(fl.amount)), 0) INTO v_pending_commission
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND COALESCE(ft.status, 'pending') = 'pending'
    AND fa.type = 'revenue'
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date);

  RETURN json_build_object(
    'totalCommission', v_total_commission,
    'pendingCommission', v_pending_commission,
    'netCommission', v_total_commission
  );
END;
$$;

-- =====================================================
-- 2. get_monthly_commission_chart (Grafico mensal)
-- Aceita 'completed' E 'confirmed'
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_monthly_commission_chart(
  p_months int DEFAULT 6
)
RETURNS TABLE (
  month_label text,
  month_date date,
  confirmed_amount numeric,
  pending_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH months AS (
    SELECT date_trunc('month', CURRENT_DATE - (n || ' months')::interval)::date as month_start
    FROM generate_series(0, p_months - 1) n
  ),
  ledger_data AS (
    SELECT 
      date_trunc('month', ft.transaction_date)::date as tx_month,
      COALESCE(ft.status, 'pending') as tx_status,
      ABS(fl.amount) as tx_amount
    FROM financial_transactions ft
    JOIN financial_ledger fl ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fa.id = fl.account_id
    WHERE ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, false)
      AND fa.type = 'revenue'
  )
  SELECT
    to_char(m.month_start, 'Mon/YY')::text,
    m.month_start,
    COALESCE(SUM(CASE WHEN ld.tx_status IN ('completed', 'confirmed') THEN ld.tx_amount ELSE 0 END), 0)::numeric,
    COALESCE(SUM(CASE WHEN ld.tx_status = 'pending' THEN ld.tx_amount ELSE 0 END), 0)::numeric
  FROM months m
  LEFT JOIN ledger_data ld ON date_trunc('month', ld.tx_month) = m.month_start
  GROUP BY m.month_start
  ORDER BY m.month_start;
END;
$$;

-- =====================================================
-- 3. Recalibrar saldo dos bancos baseado no ledger
-- =====================================================
UPDATE bank_accounts ba
SET current_balance = sub.calculated_balance
FROM (
    SELECT 
        ft.bank_account_id,
        COALESCE(SUM(
            CASE 
                WHEN fa.type = 'revenue' THEN ABS(fl.amount)
                WHEN fa.type = 'expense' THEN -ABS(fl.amount)
                ELSE 0 
            END
        ), 0) AS calculated_balance
    FROM financial_ledger fl
    JOIN financial_transactions ft ON fl.transaction_id = ft.id
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE ft.bank_account_id IS NOT NULL
      AND ft.status IN ('completed', 'confirmed')
      AND NOT COALESCE(ft.is_void, false)
    GROUP BY ft.bank_account_id
) sub
WHERE sub.bank_account_id = ba.id;

-- =====================================================
-- 4. Trigger para atualizar saldo ao confirmar transacao
-- =====================================================
CREATE OR REPLACE FUNCTION update_bank_balance_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_impact numeric;
BEGIN
  IF (NEW.status IN ('confirmed', 'completed'))
     AND NEW.bank_account_id IS NOT NULL
     AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'completed'))
  THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN fa.type = 'revenue' THEN ABS(fl.amount)
        WHEN fa.type = 'expense' THEN -ABS(fl.amount)
        ELSE 0
      END
    ), 0) INTO v_impact
    FROM financial_ledger fl
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE fl.transaction_id = NEW.id;

    UPDATE bank_accounts
    SET current_balance = current_balance + v_impact
    WHERE id = NEW.bank_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_bank_balance ON financial_transactions;

CREATE TRIGGER trg_update_bank_balance
  AFTER UPDATE OF status ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_balance_on_confirm();
