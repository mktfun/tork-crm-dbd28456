-- =====================================================
-- FIX V3: Função ultra-simples para saldo bancário
-- =====================================================
-- 
-- Problema: Funções anteriores quebravam por:
-- - ENUM 'income' não existe (é 'revenue')
-- - Coluna 'status' não existe em financial_transactions
-- - Comparações de tipo incorretas
--
-- Solução: Retornar apenas o saldo inicial da tabela bank_accounts
-- (depois podemos adicionar cálculos mais complexos gradualmente)
--
-- Data: 2026-02-06
-- =====================================================

-- Função ultra-simples: retorna apenas current_balance
CREATE OR REPLACE FUNCTION get_bank_balance(
  p_bank_account_id UUID,
  p_include_pending BOOLEAN DEFAULT false
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(
    (SELECT current_balance FROM bank_accounts WHERE id = p_bank_account_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_bank_balance IS 
'Retorna o saldo atual de uma conta bancária (versão simplificada).';

-- Também garantir que a função get_bank_transactions existe e retorna dados válidos
DROP FUNCTION IF EXISTS get_bank_transactions(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_bank_transactions(
  p_bank_account_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  transactions JSON,
  total_count INTEGER,
  total_income DECIMAL,
  total_expense DECIMAL,
  page_count INTEGER
) AS $$
DECLARE
  v_offset INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  WITH filtered_transactions AS (
    SELECT DISTINCT ON (ft.id)
      ft.id as transaction_id,
      ft.transaction_date,
      ft.description,
      ABS(COALESCE(fl.amount, 0)) as amount,
      COALESCE(fa.name, 'Sem categoria') as account_name,
      COALESCE(fa.type::TEXT, 'expense') as account_type,
      ft.bank_account_id,
      ba.bank_name,
      ba.color as bank_color,
      'confirmed' as status,
      COALESCE(ft.is_void, false) as is_void,
      ft.related_entity_type,
      ft.related_entity_id
    FROM financial_transactions ft
    LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
    LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN bank_accounts ba ON ba.id = ft.bank_account_id
    WHERE ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, false)
      AND ft.bank_account_id IS NOT NULL
      AND (p_bank_account_id IS NULL OR ft.bank_account_id = p_bank_account_id)
    ORDER BY ft.id, ft.transaction_date DESC
  ),
  paginated AS (
    SELECT * FROM filtered_transactions
    ORDER BY transaction_date DESC
    LIMIT p_page_size OFFSET v_offset
  ),
  totals AS (
    SELECT 
      COUNT(*) as cnt,
      COALESCE(SUM(CASE WHEN account_type = 'revenue' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN account_type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM filtered_transactions
  )
  SELECT 
    COALESCE((SELECT json_agg(row_to_json(p)) FROM paginated p), '[]'::json),
    (SELECT cnt::INTEGER FROM totals),
    (SELECT income FROM totals),
    (SELECT expense FROM totals),
    GREATEST(CEIL((SELECT cnt FROM totals)::DECIMAL / p_page_size)::INTEGER, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_bank_transactions IS 
'Busca transações paginadas de um banco ou de todos os bancos.';
