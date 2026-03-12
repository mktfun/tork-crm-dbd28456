-- Fix get_reconciliation_kpis: use financial_transactions (same as list),
-- add bank_account_id IS NOT NULL for consolidated, restore previous period, align type checks
CREATE OR REPLACE FUNCTION public.get_reconciliation_kpis(
    p_bank_account_id text,
    p_start_date date,
    p_end_date date,
    p_search_term text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_bank_uuid UUID;
    v_user_id UUID := auth.uid();
    v_period_days INTEGER;
    v_prev_start DATE;
    v_prev_end DATE;
    v_cur_total_count INTEGER;
    v_cur_pending_count INTEGER;
    v_cur_reconciled_count INTEGER;
    v_cur_ignored_count INTEGER;
    v_cur_reconciled_revenue NUMERIC;
    v_cur_reconciled_expense NUMERIC;
    v_cur_pending_revenue NUMERIC;
    v_cur_pending_expense NUMERIC;
    v_prev_total_count INTEGER;
    v_prev_pending_count INTEGER;
    v_prev_reconciled_count INTEGER;
    v_prev_ignored_count INTEGER;
    v_prev_reconciled_revenue NUMERIC;
    v_prev_reconciled_expense NUMERIC;
    v_prev_pending_revenue NUMERIC;
    v_prev_pending_expense NUMERIC;
BEGIN
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    v_period_days := p_end_date - p_start_date + 1;
    v_prev_end := p_start_date - 1;
    v_prev_start := v_prev_end - v_period_days + 1;

    -- CURRENT PERIOD (reads financial_transactions, same table as paginated list)
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.reconciled = TRUE THEN 1 ELSE 0 END), 0),
        0,
        COALESCE(SUM(CASE WHEN t.reconciled = TRUE AND t.type IN ('revenue','income','Entrada') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.reconciled = TRUE AND t.type IN ('expense','despesa','Saída') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) AND t.type IN ('revenue','income','Entrada') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) AND t.type IN ('expense','despesa','Saída') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0)
    INTO
        v_cur_total_count, v_cur_pending_count, v_cur_reconciled_count, v_cur_ignored_count,
        v_cur_reconciled_revenue, v_cur_reconciled_expense, v_cur_pending_revenue, v_cur_pending_expense
    FROM financial_transactions t
    WHERE t.user_id = v_user_id
      AND NOT COALESCE(t.is_void, false)
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND (v_bank_uuid IS NOT NULL AND t.bank_account_id = v_bank_uuid
           OR v_bank_uuid IS NULL AND t.bank_account_id IS NOT NULL)
      AND (p_search_term IS NULL OR t.description ILIKE '%' || p_search_term || '%');

    -- PREVIOUS PERIOD
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.reconciled = TRUE THEN 1 ELSE 0 END), 0),
        0,
        COALESCE(SUM(CASE WHEN t.reconciled = TRUE AND t.type IN ('revenue','income','Entrada') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.reconciled = TRUE AND t.type IN ('expense','despesa','Saída') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) AND t.type IN ('revenue','income','Entrada') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) AND t.type IN ('expense','despesa','Saída') THEN COALESCE(t.total_amount,0) ELSE 0 END), 0)
    INTO
        v_prev_total_count, v_prev_pending_count, v_prev_reconciled_count, v_prev_ignored_count,
        v_prev_reconciled_revenue, v_prev_reconciled_expense, v_prev_pending_revenue, v_prev_pending_expense
    FROM financial_transactions t
    WHERE t.user_id = v_user_id
      AND NOT COALESCE(t.is_void, false)
      AND t.transaction_date BETWEEN v_prev_start AND v_prev_end
      AND (v_bank_uuid IS NOT NULL AND t.bank_account_id = v_bank_uuid
           OR v_bank_uuid IS NULL AND t.bank_account_id IS NOT NULL)
      AND (p_search_term IS NULL OR t.description ILIKE '%' || p_search_term || '%');

    RETURN json_build_object(
        'current', json_build_object(
            'total_count', v_cur_total_count,
            'pending_count', v_cur_pending_count,
            'reconciled_count', v_cur_reconciled_count,
            'ignored_count', v_cur_ignored_count,
            'total_amount', (v_cur_reconciled_revenue + v_cur_pending_revenue) - (v_cur_reconciled_expense + v_cur_pending_expense),
            'reconciled_amount', v_cur_reconciled_revenue - v_cur_reconciled_expense,
            'pending_amount', v_cur_pending_revenue - v_cur_pending_expense,
            'reconciled_revenue', v_cur_reconciled_revenue,
            'reconciled_expense', v_cur_reconciled_expense,
            'pending_revenue', v_cur_pending_revenue,
            'pending_expense', v_cur_pending_expense,
            'net_pending', v_cur_pending_revenue - v_cur_pending_expense,
            'net_reconciled', v_cur_reconciled_revenue - v_cur_reconciled_expense
        ),
        'previous', json_build_object(
            'total_count', v_prev_total_count,
            'pending_count', v_prev_pending_count,
            'reconciled_count', v_prev_reconciled_count,
            'ignored_count', v_prev_ignored_count,
            'total_amount', (v_prev_reconciled_revenue + v_prev_pending_revenue) - (v_prev_reconciled_expense + v_prev_pending_expense),
            'reconciled_amount', v_prev_reconciled_revenue - v_prev_reconciled_expense,
            'pending_amount', v_prev_pending_revenue - v_prev_pending_expense,
            'reconciled_revenue', v_prev_reconciled_revenue,
            'reconciled_expense', v_prev_reconciled_expense,
            'pending_revenue', v_prev_pending_revenue,
            'pending_expense', v_prev_pending_expense,
            'net_pending', v_prev_pending_revenue - v_prev_pending_expense,
            'net_reconciled', v_prev_reconciled_revenue - v_prev_reconciled_expense
        )
    );
END;
$function$;

-- Fix get_bank_statement_paginated: add bank_account_id IS NOT NULL for consolidated mode
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
    id uuid, transaction_date date, bank_name text, type text,
    description text, category_name text, amount numeric,
    running_balance numeric, status_display text, reconciled boolean,
    bank_account_id uuid, total_count bigint, reconciled_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
          AND (v_bank_uuid IS NOT NULL AND t.bank_account_id = v_bank_uuid
               OR v_bank_uuid IS NULL AND t.bank_account_id IS NOT NULL)
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