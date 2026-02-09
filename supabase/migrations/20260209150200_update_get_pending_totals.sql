-- =======================================================================
-- HOTFIX: Update get_pending_totals to use is_confirmed column
-- =======================================================================
-- Problem: get_pending_totals uses old logic with fa.code = '1.2.01'
--          and transactions.status = 'PAGO' which may not exist
-- Solution: Rewrite to use is_confirmed column we just added
-- Date: 2026-02-09
-- =======================================================================

CREATE OR REPLACE FUNCTION get_pending_totals(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_a_receber NUMERIC := 0;
  v_total_a_pagar NUMERIC := 0;
  v_count_a_receber INT := 0;
  v_count_a_pagar INT := 0;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'total_a_receber', 0,
      'total_a_pagar', 0,
      'count_a_receber', 0,
      'count_a_pagar', 0
    );
  END IF;

  -- Calcular total A RECEBER (Receitas não confirmadas)
  SELECT 
    COALESCE(SUM(ABS(fl.amount)), 0),
    COUNT(DISTINCT ft.id)
  INTO v_total_a_receber, v_count_a_receber
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.is_void = false
    AND NOT COALESCE(ft.is_confirmed, false)  -- Pendentes
    AND (fa.type = 'revenue' OR fa.type = 'income')
    AND fl.amount > 0
    AND (p_start_date IS NULL OR ft.transaction_date::date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date::date <= p_end_date);

  -- Calcular total A PAGAR (Despesas não confirmadas)
  SELECT 
    COALESCE(SUM(ABS(fl.amount)), 0),
    COUNT(DISTINCT ft.id)
  INTO v_total_a_pagar, v_count_a_pagar
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND ft.is_void = false
    AND NOT COALESCE(ft.is_confirmed, false)  -- Pendentes
    AND fa.type = 'expense'
    AND fl.amount > 0
    AND (p_start_date IS NULL OR ft.transaction_date::date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date::date <= p_end_date);

  RETURN json_build_object(
    'total_a_receber', v_total_a_receber,
    'total_a_pagar', v_total_a_pagar,
    'count_a_receber', v_count_a_receber,
    'count_a_pagar', v_count_a_pagar
  );
END;
$$;

COMMENT ON FUNCTION get_pending_totals IS 
'Retorna totais de transações pendentes (is_confirmed=false) a pagar e receber. Atualizado para usar coluna is_confirmed ao invés de códigos de contas legacy.';

GRANT EXECUTE ON FUNCTION get_pending_totals(DATE, DATE) TO authenticated;
