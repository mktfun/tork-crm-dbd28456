-- =====================================================
-- FIX V4: Função super simples para transações bancárias
-- =====================================================
-- 
-- Esta versão evita:
-- - Tipos customizados (CASCADE pode ter removido dependências)
-- - JSON array complexo
-- - Qualquer coisa que possa quebrar
--
-- Retorna um JSONB simples que é fácil de parsear no frontend
--
-- Data: 2026-02-06
-- =====================================================

-- Dropar a função antiga se existir (qualquer assinatura)
DROP FUNCTION IF EXISTS get_bank_transactions(UUID, INTEGER, INTEGER);

-- Criar função limpa que retorna JSONB
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

  -- Contar total e somas
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(CASE WHEN fa.type::TEXT = 'revenue' THEN ABS(fl.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fa.type::TEXT = 'expense' THEN ABS(fl.amount) ELSE 0 END), 0)
  INTO v_total, v_income, v_expense
  FROM financial_transactions ft
  LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id AND fl.amount > 0
  LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = v_user_id
    AND NOT COALESCE(ft.is_void, false)
    AND ft.bank_account_id IS NOT NULL
    AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id);

  -- Buscar transações paginadas
  SELECT jsonb_build_object(
    'transactions', COALESCE(jsonb_agg(tx ORDER BY tx.transaction_date DESC), '[]'::jsonb),
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
    ft.transaction_date
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

COMMENT ON FUNCTION get_bank_transactions IS 
'Busca transações paginadas de um banco. Retorna JSONB para fácil parsing.';
