-- =====================================================
-- FIX V6: Corrigir erro de referência de coluna (42P01)
-- =====================================================
-- 
-- Problema: V5 introduziu erro "missing FROM-clause entry for table 'tx'"
-- Motivo: ORDER BY tx.transaction_date dentro do jsonb_agg tentava acessar
-- 'tx' como tabela, mas 'tx' é uma coluna jsonb da subquery.
--
-- Solução: Usar ORDER BY transaction_date (que é uma coluna da subquery)
--
-- Data: 2026-02-06
-- =====================================================

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

  -- Contar total e somas (mantido da V5)
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN fa.type::TEXT IN ('revenue', 'income') THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type::TEXT = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_total, v_income, v_expense
  FROM financial_transactions ft
  LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id AND fl.amount > 0
  LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND ft.bank_account_id IS NOT NULL
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id);

  -- Buscar transações paginadas (CORRIGIDO ORDER BY)
  SELECT jsonb_build_object(
    'transactions', COALESCE(jsonb_agg(tx ORDER BY transaction_date DESC), '[]'::jsonb),
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
      'amount', ABS(COALESCE(fl.amount, 0)),
      'account_name', COALESCE(fa.name, 'Sem categoria'),
      'account_type', COALESCE(fa.type::TEXT, 'expense'),
      'bank_account_id', ft.bank_account_id,
      'bank_name', ba.bank_name,
      'bank_color', ba.color,
      'is_void', COALESCE(ft.is_void, false),
      'related_entity_type', ft.related_entity_type,
      'related_entity_id', ft.related_entity_id
    ) as tx,
    ft.transaction_date -- Mantido para ordenação
    FROM financial_transactions ft
    LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id AND fl.amount > 0
    LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id
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

GRANT EXECUTE ON FUNCTION get_bank_transactions(UUID, INTEGER, INTEGER) TO authenticated;
