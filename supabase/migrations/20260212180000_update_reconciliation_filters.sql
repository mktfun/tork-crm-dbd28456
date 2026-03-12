-- =====================================================================
-- 🛠 MIGRATION: UPDATE RECONCILIATION FILTERS
-- Timestamp: 20260212180000
-- Objetivo: Adicionar filtros de busca, status e tipo na função de extrato paginado.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_bank_statement_paginated(
    p_bank_account_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_search_term TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'todas', -- 'todas', 'pendente', 'conciliado'
    p_type TEXT DEFAULT 'todos'    -- 'todos', 'receita', 'despesa'
)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    bank_name TEXT,
    type TEXT,
    description TEXT,
    category_name TEXT,
    amount NUMERIC,
    running_balance NUMERIC,
    status_display TEXT,
    reconciled BOOLEAN,
    bank_account_id UUID,
    total_count BIGINT
) AS $$
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
            COUNT(*) OVER() AS full_count
        FROM financial_transactions t
        LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
        WHERE t.user_id = v_user_id
          AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND NOT COALESCE(t.is_void, false)
          -- Filtro de Busca (Descrição ou Categoria)
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
          -- Filtro de Tipo
          AND (
              p_type = 'todos' OR
              (p_type = 'receita' AND t.type IN ('revenue', 'receita', 'Entrada')) OR
              (p_type = 'despesa' AND t.type IN ('expense', 'despesa', 'Saída'))
          )
          -- Filtro de Status
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
        wb.reconciled, wb.tx_bank_account_id, wb.full_count
    FROM with_balance wb
    ORDER BY wb.tx_date DESC, wb.created_at DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
