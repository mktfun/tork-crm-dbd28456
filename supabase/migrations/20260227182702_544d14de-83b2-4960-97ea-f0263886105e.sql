-- Issue 1: Fix get_bank_transactions RPC to use ft.type instead of LATERAL join for classification
CREATE OR REPLACE FUNCTION get_bank_transactions(
  p_bank_account_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_user_id UUID;
  v_result JSONB;
  v_total INTEGER;
  v_income DECIMAL;
  v_expense DECIMAL;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Usuário não autenticado');
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- 1. Calcular totais usando ft.type diretamente (fonte verdadeira)
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN COALESCE(ft.type, 'expense') IN ('revenue', 'income') THEN ABS(ft.total_amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN COALESCE(ft.type, 'expense') = 'expense' THEN ABS(ft.total_amount) ELSE 0 END), 0)
  INTO v_total, v_income, v_expense
  FROM financial_transactions ft
  LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
  LEFT JOIN financial_accounts fa ON fa.id = fl.account_id AND fa.type IN ('revenue', 'expense')
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND ft.bank_account_id IS NOT NULL
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    AND (
      p_search IS NULL OR 
      p_search = '' OR 
      ft.description ILIKE '%' || p_search || '%' OR 
      fa.name ILIKE '%' || p_search || '%'
    )
  GROUP BY ft.id
  HAVING true;

  -- Recalcular totais corretamente (a query acima expande por ledger entries)
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN COALESCE(ft.type, 'expense') IN ('revenue', 'income') THEN ABS(COALESCE(ft.total_amount, 0)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN COALESCE(ft.type, 'expense') = 'expense' THEN ABS(COALESCE(ft.total_amount, 0)) ELSE 0 END), 0)
  INTO v_total, v_income, v_expense
  FROM financial_transactions ft
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND ft.bank_account_id IS NOT NULL
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    AND (
      p_search IS NULL OR 
      p_search = '' OR 
      ft.description ILIKE '%' || p_search || '%'
    );

  -- 2. Buscar transações paginadas
  SELECT jsonb_build_object(
    'transactions', COALESCE(jsonb_agg(tx ORDER BY transaction_date DESC, created_at DESC), '[]'::jsonb),
    'total_count', COALESCE(v_total, 0),
    'total_income', COALESCE(v_income, 0),
    'total_expense', COALESCE(v_expense, 0),
    'page_count', GREATEST(CEIL(COALESCE(v_total, 0)::DECIMAL / p_page_size)::INTEGER, 1)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'transaction_id', ft.id,
      'transaction_date', ft.transaction_date,
      'description', ft.description,
      'amount', ABS(COALESCE(ft.total_amount, 0)),
      'account_name', COALESCE(fa.name, 'Sem categoria'),
      'account_type', COALESCE(ft.type, 'expense'),
      'bank_account_id', ft.bank_account_id,
      'bank_name', ba.bank_name,
      'bank_color', ba.color,
      'is_void', COALESCE(ft.is_void, false),
      'related_entity_type', ft.related_entity_type,
      'related_entity_id', ft.related_entity_id,
      'is_reconciled', COALESCE(ft.reconciled, false)
    ) as tx,
    ft.transaction_date,
    ft.created_at
    FROM financial_transactions ft
    LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id
    LEFT JOIN LATERAL (
      SELECT fa2.name
      FROM financial_ledger fl2
      LEFT JOIN financial_accounts fa2 ON fa2.id = fl2.account_id
      WHERE fl2.transaction_id = ft.id
        AND fa2.type IN ('revenue', 'expense')
      ORDER BY ABS(fl2.amount) DESC
      LIMIT 1
    ) fa ON true
    WHERE ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, false)
      AND ft.bank_account_id IS NOT NULL
      AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
      AND (
        p_search IS NULL OR 
        p_search = '' OR 
        ft.description ILIKE '%' || p_search || '%' OR
        fa.name ILIKE '%' || p_search || '%'
      )
    ORDER BY ft.transaction_date DESC, ft.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) sub;

  RETURN COALESCE(v_result, jsonb_build_object(
    'transactions', '[]'::jsonb,
    'total_count', 0,
    'total_income', 0,
    'total_expense', 0,
    'page_count', 1
  ));
END;
$$;