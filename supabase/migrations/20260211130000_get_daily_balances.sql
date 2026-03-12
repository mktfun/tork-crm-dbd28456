-- Migration: Create get_daily_balances RPC
-- Date: 2026-02-11 13:00:00

CREATE OR REPLACE FUNCTION get_daily_balances(
  p_bank_account_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  date date,
  balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_initial_balance numeric;
BEGIN
  -- 1. Calcular o saldo inicial (saldo até p_start_date - 1 dia)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_initial_balance
  FROM bank_transactions
  WHERE bank_account_id = p_bank_account_id
    AND transaction_date < p_start_date;

  -- 2. Gerar série de dias e calcular saldo acumulado dia a dia
  RETURN QUERY
  WITH daily_movements AS (
    SELECT
      transaction_date,
      SUM(amount) as daily_amount
    FROM bank_transactions
    WHERE bank_account_id = p_bank_account_id
      AND transaction_date BETWEEN p_start_date AND p_end_date
    GROUP BY transaction_date
  ),
  dates AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as day
  )
  SELECT
    d.day,
    v_initial_balance + COALESCE(SUM(dm.daily_amount) OVER (ORDER BY d.day), 0) as balance
  FROM dates d
  LEFT JOIN daily_movements dm ON d.day = dm.transaction_date
  ORDER BY d.day;
END;
$$;
