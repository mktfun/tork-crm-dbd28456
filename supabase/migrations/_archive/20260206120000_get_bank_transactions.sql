-- =====================================================
-- FUNÇÃO: get_bank_transactions
-- =====================================================
-- 
-- Propósito: Buscar transações de um banco específico com paginação
--            Ou de todos os bancos se bank_account_id = NULL
--
-- Retorna: transações + metadados para KPIs
--
-- Data: 2026-02-06
-- =====================================================

-- Tipo para retorno da função
DROP TYPE IF EXISTS bank_transaction_row CASCADE;
CREATE TYPE bank_transaction_row AS (
  transaction_id UUID,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL,
  account_name TEXT,
  account_type TEXT,
  bank_account_id UUID,
  bank_name TEXT,
  bank_color TEXT,
  status TEXT,
  is_void BOOLEAN,
  related_entity_type TEXT,
  related_entity_id UUID
);

-- Função principal: busca transações paginadas
CREATE OR REPLACE FUNCTION get_bank_transactions(
  p_bank_account_id UUID DEFAULT NULL, -- NULL = todos os bancos
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  transactions bank_transaction_row[],
  total_count INTEGER,
  total_income DECIMAL,
  total_expense DECIMAL,
  page_count INTEGER
) AS $$
DECLARE
  v_offset INTEGER;
  v_user_id UUID;
  v_transactions bank_transaction_row[];
  v_total INTEGER;
  v_income DECIMAL;
  v_expense DECIMAL;
BEGIN
  -- Pegar user_id atual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Calcular offset
  v_offset := (p_page - 1) * p_page_size;

  -- Buscar transações paginadas
  SELECT ARRAY_AGG(row_data) INTO v_transactions
  FROM (
    SELECT ROW(
      ft.id,
      ft.transaction_date,
      ft.description,
      ABS(fl.amount),
      fa.name,
      fa.type,
      COALESCE(ft.bank_account_id, tbd.bank_account_id),
      ba.bank_name,
      ba.color,
      ft.status,
      ft.is_void,
      ft.related_entity_type,
      ft.related_entity_id
    )::bank_transaction_row as row_data
    FROM financial_transactions ft
    LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
    LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
    LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
    LEFT JOIN bank_accounts ba ON ba.id = COALESCE(ft.bank_account_id, tbd.bank_account_id)
    WHERE ft.user_id = v_user_id
      AND NOT ft.is_void
      -- Filtro por banco: se NULL busca todos, senão filtra
      AND (
        p_bank_account_id IS NULL 
        OR ft.bank_account_id = p_bank_account_id
        OR tbd.bank_account_id = p_bank_account_id
      )
      -- Apenas transações com banco vinculado (exceto quando buscando todos)
      AND (
        p_bank_account_id IS NOT NULL 
        OR ft.bank_account_id IS NOT NULL 
        OR tbd.bank_account_id IS NOT NULL
      )
      AND fl.amount > 0 -- Pega apenas o lado positivo (débito)
    ORDER BY ft.transaction_date DESC, ft.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) sub;

  -- Contar total (sem paginação) - para todos os resultados
  SELECT COUNT(DISTINCT ft.id) INTO v_total
  FROM financial_transactions ft
  LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
  WHERE ft.user_id = v_user_id
    AND NOT ft.is_void
    AND (
      p_bank_account_id IS NULL 
      OR ft.bank_account_id = p_bank_account_id
      OR tbd.bank_account_id = p_bank_account_id
    )
    AND (
      p_bank_account_id IS NOT NULL 
      OR ft.bank_account_id IS NOT NULL 
      OR tbd.bank_account_id IS NOT NULL
    );

  -- Calcular totais de receita (para KPIs) - SEM paginação
  SELECT COALESCE(SUM(
    CASE WHEN fa.type = 'revenue' OR fa.type = 'income' THEN ABS(fl.amount) ELSE 0 END
  ), 0) INTO v_income
  FROM financial_transactions ft
  LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
  LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
  WHERE ft.user_id = v_user_id
    AND NOT ft.is_void
    AND ft.status = 'confirmed'
    AND fl.amount > 0
    AND (
      p_bank_account_id IS NULL 
      OR ft.bank_account_id = p_bank_account_id
      OR tbd.bank_account_id = p_bank_account_id
    )
    AND (
      p_bank_account_id IS NOT NULL 
      OR ft.bank_account_id IS NOT NULL 
      OR tbd.bank_account_id IS NOT NULL
    );

  -- Calcular totais de despesa (para KPIs) - SEM paginação
  SELECT COALESCE(SUM(
    CASE WHEN fa.type = 'expense' THEN ABS(fl.amount) ELSE 0 END
  ), 0) INTO v_expense
  FROM financial_transactions ft
  LEFT JOIN financial_ledger fl ON fl.transaction_id = ft.id
  LEFT JOIN financial_accounts fa ON fa.id = fl.account_id
  LEFT JOIN transaction_bank_distribution tbd ON tbd.transaction_id = ft.id
  WHERE ft.user_id = v_user_id
    AND NOT ft.is_void
    AND ft.status = 'confirmed'
    AND fl.amount > 0
    AND (
      p_bank_account_id IS NULL 
      OR ft.bank_account_id = p_bank_account_id
      OR tbd.bank_account_id = p_bank_account_id
    )
    AND (
      p_bank_account_id IS NOT NULL 
      OR ft.bank_account_id IS NOT NULL 
      OR tbd.bank_account_id IS NOT NULL
    );

  RETURN QUERY SELECT 
    COALESCE(v_transactions, ARRAY[]::bank_transaction_row[]),
    v_total,
    v_income,
    v_expense,
    CEIL(v_total::DECIMAL / p_page_size)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_bank_transactions IS 
'Busca transações vinculadas a um banco específico (ou todos) com paginação.
Retorna: transações[], total_count, total_income, total_expense, page_count.
- p_bank_account_id NULL = busca todas as transações com banco
- Usado na tela de histórico bancário';
