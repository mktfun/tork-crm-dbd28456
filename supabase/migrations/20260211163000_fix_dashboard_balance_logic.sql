CREATE OR REPLACE FUNCTION public.get_bank_balance(p_bank_account_id uuid, p_include_pending boolean DEFAULT false)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  -- Se p_include_pending for true, retorna o saldo contábil (tudo que foi lançado)
  IF p_include_pending THEN
    RETURN COALESCE(
      (SELECT current_balance FROM bank_accounts WHERE id = p_bank_account_id),
      0
    );
  END IF;

  -- Se p_include_pending for false (padrão), retorna saldo RECONCILIADO
  -- Calculamos somando todas as transações conciliadas e não anuladas
  SELECT COALESCE(SUM(amount), 0)
  INTO v_balance
  FROM financial_ledger fl
  JOIN financial_transactions ft ON ft.id = fl.transaction_id
  WHERE ft.bank_account_id = p_bank_account_id
    AND ft.is_reconciled = true
    AND NOT COALESCE(ft.is_void, false);
    
  RETURN v_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_bank_transactions(p_bank_account_id uuid, p_start_date date, p_end_date date, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_reconciled_only boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_user_id UUID;
  v_transactions JSON;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_user_id := auth.uid();

  -- 1. Calcular totais (Receitas e Despesas) SOMENTE CONCILIADOS
  -- A dashboard mostra "Receitas" e "Despesas". Se o saldo é conciliado, os totais também devem ser.
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') AND ft.is_reconciled = true THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' AND ft.is_reconciled = true THEN tx_data.amount ELSE 0 END), 0)
  INTO
    v_total_count,
    v_total_income,
    v_total_expense
  FROM financial_transactions ft
  LEFT JOIN LATERAL (
    SELECT
      l.amount,
      CASE
        WHEN c.type = 'expense' THEN 'expense'
        WHEN c.type = 'income' THEN 'revenue'
        ELSE 'other'
      END as type
    FROM financial_ledger l
    LEFT JOIN financial_categories c ON c.id = ft.category_id
    WHERE l.transaction_id = ft.id
    LIMIT 1
  ) tx_data ON true
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
    AND (p_search IS NULL OR ft.description ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR ft.status = p_status)
    AND (NOT p_reconciled_only OR ft.is_reconciled = true);

  -- 2. Buscar transações paginadas
  SELECT json_agg(
    json_build_object(
      'transactionId', t.id,
      'transactionDate', t.transaction_date,
      'amount', l.amount,
      'description', t.description,
      'category', c.name,
      'accountName', ba.bank_name,
      'accountType', CASE WHEN c.type = 'expense' THEN 'expense' ELSE 'revenue' END,
      'status', t.status,
      'is_reconciled', t.is_reconciled,
      'bankName', ba.bank_name
    ) ORDER BY t.transaction_date DESC, t.created_at DESC
  )
  INTO v_transactions
  FROM (
    SELECT * FROM financial_transactions ft
    WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
    AND (p_search IS NULL OR ft.description ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR ft.status = p_status)
    AND (NOT p_reconciled_only OR ft.is_reconciled = true)
    LIMIT p_page_size OFFSET v_offset
  ) t
  JOIN financial_ledger l ON l.transaction_id = t.id
  LEFT JOIN financial_categories c ON c.id = t.category_id
  LEFT JOIN bank_accounts ba ON ba.id = t.bank_account_id;

  RETURN json_build_object(
    'data', COALESCE(v_transactions, '[]'::json),
    'totalCount', v_total_count,
    'totalIncome', v_total_income,
    'totalExpense', v_total_expense
  );
END;
$function$;
