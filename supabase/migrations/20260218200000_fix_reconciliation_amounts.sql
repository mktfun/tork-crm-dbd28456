-- Migration: Fix get_reconciliation_kpis to return separate amounts
-- Problem: Frontend needs 'reconciled_amount' and 'pending_amount' separately, but RPC only returned 'total_amount'.

CREATE OR REPLACE FUNCTION get_reconciliation_kpis(
    p_bank_account_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_search_term TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_bank_uuid UUID;
    v_user_id UUID := auth.uid();
    
    -- Current Period
    v_current_total_count INTEGER;
    v_current_reconciled_count INTEGER;
    v_current_pending_count INTEGER;
    v_current_total_amount NUMERIC;
    v_current_reconciled_amount NUMERIC; -- NEW
    v_current_pending_amount NUMERIC;    -- NEW
    
    -- Comparison Period
    v_prev_start_date DATE;
    v_prev_end_date DATE;
    v_prev_total_count INTEGER;
    v_prev_reconciled_count INTEGER;
    v_prev_pending_count INTEGER;
    v_prev_total_amount NUMERIC;
    v_prev_reconciled_amount NUMERIC; -- NEW
    v_prev_pending_amount NUMERIC;    -- NEW
    
    v_period_days INTEGER;
BEGIN
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    -- Calculate Previous Period
    v_period_days := p_end_date - p_start_date;
    v_prev_end_date := p_start_date - 1;
    v_prev_start_date := v_prev_end_date - v_period_days;

    -- 1. CURRENT PERIOD
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND status != 'ignored' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN total_amount ELSE 0 END), 0), -- Reconciled Amount
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND status != 'ignored' THEN total_amount ELSE 0 END), 0) -- Pending Amount
    INTO
        v_current_total_count,
        v_current_reconciled_count,
        v_current_pending_count,
        v_current_total_amount,
        v_current_reconciled_amount,
        v_current_pending_amount
    FROM financial_transactions t
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
        );

    -- 2. PREVIOUS PERIOD
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND status != 'ignored' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND status != 'ignored' THEN total_amount ELSE 0 END), 0)
    INTO
        v_prev_total_count,
        v_prev_reconciled_count,
        v_prev_pending_count,
        v_prev_total_amount,
        v_prev_reconciled_amount,
        v_prev_pending_amount
    FROM financial_transactions t
    WHERE t.user_id = v_user_id
        AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
        AND t.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
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
        );

    RETURN json_build_object(
        'current', json_build_object(
            'total_count', v_current_total_count,
            'reconciled_count', v_current_reconciled_count,
            'pending_count', v_current_pending_count,
            'total_amount', v_current_total_amount,
            'reconciled_amount', v_current_reconciled_amount, -- NEW field
            'pending_amount', v_current_pending_amount        -- NEW field
        ),
        'previous', json_build_object(
            'total_count', v_prev_total_count,
            'reconciled_count', v_prev_reconciled_count,
            'pending_count', v_prev_pending_count,
            'total_amount', v_prev_total_amount,
            'reconciled_amount', v_prev_reconciled_amount, -- NEW field
            'pending_amount', v_prev_pending_amount        -- NEW field
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
