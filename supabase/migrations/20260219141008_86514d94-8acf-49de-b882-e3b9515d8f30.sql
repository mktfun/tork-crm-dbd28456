CREATE OR REPLACE FUNCTION get_reconciliation_kpis(
    p_bank_account_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_search_term TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_bank_uuid UUID; v_user_id UUID := auth.uid();
    v_cur_reconciled_revenue NUMERIC; v_cur_reconciled_expense NUMERIC;
    v_cur_pending_revenue NUMERIC; v_cur_pending_expense NUMERIC;
    v_cur_total_count INTEGER; v_cur_pending_count INTEGER;
    v_cur_reconciled_count INTEGER; v_cur_ignored_count INTEGER;
BEGIN
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND COALESCE(status, 'pending') != 'ignored' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(status, 'pending') = 'ignored' THEN 1 ELSE 0 END), 0),
        -- Reconciled Breakdown
        COALESCE(SUM(CASE WHEN reconciled = TRUE AND type = 'revenue' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN reconciled = TRUE AND type = 'expense' THEN total_amount ELSE 0 END), 0),
        -- Pending Breakdown
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND COALESCE(status, 'pending') != 'ignored' AND type = 'revenue' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND COALESCE(status, 'pending') != 'ignored' AND type = 'expense' THEN total_amount ELSE 0 END), 0)
    INTO
        v_cur_total_count,
        v_cur_pending_count,
        v_cur_reconciled_count,
        v_cur_ignored_count,
        v_cur_reconciled_revenue,
        v_cur_reconciled_expense,
        v_cur_pending_revenue,
        v_cur_pending_expense
    FROM financial_transactions t
    WHERE t.user_id = v_user_id
      AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(t.is_void, false)
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
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;