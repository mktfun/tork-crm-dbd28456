-- ============================================================
-- CORREÇÃO: get_bank_transactions zerado para Receitas
-- A query anterior filtrava (amount > 0), o que excluía receitas
-- no novo sistema (onde receita é crédito/negativo e não há contra-partida positiva no ledger).
-- Solução: Usar LATERAL JOIN para buscar a melhor linha do ledger (Priorizando Categoria).
-- ============================================================

CREATE OR REPLACE FUNCTION get_bank_transactions(
  p_bank_account_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
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

  -- 1. Calcular totais (Receitas e Despesas)
  -- Precisa ajustar para olhar o tipo da conta, não apenas o sinal
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN tx_data.type IN ('revenue', 'income') THEN tx_data.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tx_data.type = 'expense' THEN tx_data.amount ELSE 0 END), 0)
  INTO v_total, v_income, v_expense
  FROM financial_transactions ft
  CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        fa.type::TEXT as type
      FROM financial_ledger fl
      JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = ft.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
  ) tx_data
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND ft.bank_account_id IS NOT NULL
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id);

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
      'amount', tx_data.amount,
      'account_name', tx_data.name,
      'account_type', tx_data.type,
      'bank_account_id', ft.bank_account_id,
      'bank_name', ba.bank_name,
      'bank_color', ba.color,
      'is_void', COALESCE(ft.is_void, false),
      'related_entity_type', ft.related_entity_type,
      'related_entity_id', ft.related_entity_id
    ) as tx,
    ft.transaction_date,
    ft.created_at
    FROM financial_transactions ft
    LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id
    CROSS JOIN LATERAL (
      SELECT 
        ABS(fl.amount) as amount,
        COALESCE(fa.name, 'Sem categoria') as name,
        COALESCE(fa.type::TEXT, 'expense') as type
      FROM financial_ledger fl
      LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
      WHERE fl.transaction_id = ft.id
      ORDER BY 
        CASE WHEN fa.type IN ('revenue', 'expense') THEN 1 ELSE 2 END,
        ABS(fl.amount) DESC
      LIMIT 1
    ) tx_data
    WHERE ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, false)
      AND ft.bank_account_id IS NOT NULL
      AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
