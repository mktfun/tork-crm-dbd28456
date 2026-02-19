
-- =====================================================
-- Prompt 14: Fix get_transactions_for_reconciliation (bank_account_id fallback)
-- Prompt 15: Update get_bank_statement_paginated (add reconciled_by_name)
-- =====================================================

-- 1. Fix reconciliation RPC to use bank_account_id as fallback
DROP FUNCTION IF EXISTS get_transactions_for_reconciliation(uuid);

CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(p_bank_account_id UUID)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    description TEXT,
    amount NUMERIC,
    type TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
      ft.id,
      ft.transaction_date,
      ft.description,
      COALESCE(
          ABS((SELECT SUM(fl2.amount) FROM financial_ledger fl2 WHERE fl2.transaction_id = ft.id AND fl2.account_id = p_bank_account_id)),
          ft.total_amount
      ) as amount,
      fa.type::TEXT as type,
      ft.status
  FROM financial_transactions ft
  JOIN financial_ledger fl ON ft.id = fl.transaction_id
  JOIN financial_accounts fa ON fl.account_id = fa.id
  WHERE
      fa.type IN ('expense', 'revenue')
      AND ft.user_id = v_user_id
      AND NOT COALESCE(ft.is_void, FALSE)
      AND (ft.reconciled = false OR ft.reconciled IS NULL)
      AND (
          EXISTS (
              SELECT 1 FROM financial_ledger fl2
              WHERE fl2.transaction_id = ft.id
              AND fl2.account_id = p_bank_account_id
          )
          OR
          (ft.bank_account_id = p_bank_account_id)
      )
  ORDER BY ft.transaction_date DESC;
END;
$$;

-- 2. Update bank statement paginated RPC to include reconciled_by_name
CREATE OR REPLACE FUNCTION public.get_bank_statement_paginated(
    p_bank_account_id text,
    p_start_date date,
    p_end_date date,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 20,
    p_search_term text DEFAULT NULL::text,
    p_status text DEFAULT 'todas'::text,
    p_type text DEFAULT 'todos'::text
)
RETURNS TABLE(
    id uuid,
    transaction_date date,
    bank_name text,
    type text,
    description text,
    category_name text,
    amount numeric,
    running_balance numeric,
    status_display text,
    reconciled boolean,
    bank_account_id uuid,
    total_count bigint,
    reconciled_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_offset INTEGER;
    v_bank_uuid UUID;
    v_user_id UUID := auth.uid();
BEGIN
    v_offset := (p_page - 1) * p_page_size;

    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    RETURN QUERY
    WITH all_movements AS (
        SELECT 
            t.id,
            t.transaction_date AS tx_date,
            COALESCE(ba.bank_name, 'Sem banco') AS bank_nm,
            t.type,
            t.description,
            COALESCE(
                (SELECT string_agg(fa.name, ', ') 
                 FROM financial_ledger fl 
                 JOIN financial_accounts fa ON fl.account_id = fa.id 
                 WHERE fl.transaction_id = t.id),
                'Sem categoria'
            ) AS cat_name,
            COALESCE(t.total_amount, 0) AS amount,
            CASE 
                WHEN t.type IN ('revenue', 'receita', 'Entrada') THEN COALESCE(t.total_amount, 0) 
                ELSE -COALESCE(t.total_amount, 0) 
            END AS impact,
            CASE 
                WHEN t.reconciled = TRUE THEN 'Conciliado'
                WHEN t.status = 'confirmed' THEN 'Pendente'
                ELSE COALESCE(t.status, 'Pendente')
            END AS status_disp,
            t.reconciled,
            t.bank_account_id AS tx_bank_account_id,
            t.created_at,
            COUNT(*) OVER() AS full_count,
            p.nome_completo as reconciled_by_nm
        FROM financial_transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        LEFT JOIN bank_statement_entries bse ON t.reconciled_statement_id = bse.id
        LEFT JOIN profiles p ON bse.matched_by = p.id
        WHERE t.user_id = v_user_id
          AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND NOT COALESCE(t.is_void, false)
          AND (
              p_search_term IS NULL OR 
              t.description ILIKE '%' || p_search_term || '%' OR
              EXISTS (
                  SELECT 1 
                  FROM financial_ledger fl 
                  JOIN financial_accounts fa ON fl.account_id = fa.id 
                  WHERE fl.transaction_id = t.id AND fa.name ILIKE '%' || p_search_term || '%'
              )
          )
          AND (
              p_type = 'todos' OR
              (p_type = 'receita' AND t.type IN ('revenue', 'receita', 'Entrada')) OR
              (p_type = 'despesa' AND t.type IN ('expense', 'despesa', 'Saída'))
          )
          AND (
              p_status = 'todas' OR
              (p_status = 'conciliado' AND t.reconciled = TRUE) OR
              (p_status = 'pendente' AND (t.reconciled = FALSE OR t.reconciled IS NULL))
          )
        ORDER BY t.transaction_date ASC, t.created_at ASC
    ),
    with_balance AS (
        SELECT *,
            SUM(impact) OVER (ORDER BY tx_date ASC, created_at ASC) AS running_bal
        FROM all_movements
    )
    SELECT 
        wb.id, wb.tx_date, wb.bank_nm, wb.type, wb.description, 
        wb.cat_name, wb.amount, wb.running_bal, wb.status_disp, 
        wb.reconciled, wb.tx_bank_account_id, wb.full_count, wb.reconciled_by_nm
    FROM with_balance wb
    ORDER BY wb.tx_date DESC, wb.created_at DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$function$;
