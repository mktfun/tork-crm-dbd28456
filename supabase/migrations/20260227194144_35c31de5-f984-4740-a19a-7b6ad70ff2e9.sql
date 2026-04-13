-- Add unlinked (no bank) counters to get_reconciliation_kpis
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
    -- Current period (with bank only)
    v_cur_total_count INTEGER;
    v_cur_pending_count INTEGER;
    v_cur_reconciled_count INTEGER;
    v_cur_ignored_count INTEGER;
    v_cur_reconciled_revenue NUMERIC;
    v_cur_reconciled_expense NUMERIC;
    v_cur_pending_revenue NUMERIC;
    v_cur_pending_expense NUMERIC;
    -- Previous period
    v_prev_total_count INTEGER;
    v_prev_pending_count INTEGER;
    v_prev_reconciled_count INTEGER;
    v_prev_ignored_count INTEGER;
    v_prev_reconciled_revenue NUMERIC;
    v_prev_reconciled_expense NUMERIC;
    v_prev_pending_revenue NUMERIC;
    v_prev_pending_expense NUMERIC;
    -- Unlinked (no bank) counters
    v_unlinked_count INTEGER;
    v_unlinked_pending INTEGER;
    v_unlinked_reconciled INTEGER;
    v_unlinked_amount NUMERIC;
BEGIN
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    v_period_days := p_end_date - p_start_date + 1;
    v_prev_end := p_start_date - 1;
    v_prev_start := v_prev_end - v_period_days + 1;

    -- CURRENT PERIOD (with bank only)
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

    -- UNLINKED (no bank) - only in consolidated mode
    IF v_bank_uuid IS NULL THEN
        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN (t.reconciled = FALSE OR t.reconciled IS NULL) THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN t.reconciled = TRUE THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(COALESCE(t.total_amount, 0)), 0)
        INTO v_unlinked_count, v_unlinked_pending, v_unlinked_reconciled, v_unlinked_amount
        FROM financial_transactions t
        WHERE t.user_id = v_user_id
          AND NOT COALESCE(t.is_void, false)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.bank_account_id IS NULL
          AND (p_search_term IS NULL OR t.description ILIKE '%' || p_search_term || '%');
    ELSE
        v_unlinked_count := 0;
        v_unlinked_pending := 0;
        v_unlinked_reconciled := 0;
        v_unlinked_amount := 0;
    END IF;

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
        ),
        'unlinked', json_build_object(
            'total_count', v_unlinked_count,
            'pending_count', v_unlinked_pending,
            'reconciled_count', v_unlinked_reconciled,
            'total_amount', v_unlinked_amount
        )
    );
END;
$function$;