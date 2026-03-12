-- Migration: Add get_reconciliation_kpis RPC
-- Purpose: Return aggregate KPIs for reconciliation screen independent of pagination.

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
    
    v_total_count INTEGER;
    v_reconciled_count INTEGER;
    v_pending_count INTEGER;
    v_ignored_count INTEGER;
    
    v_total_amount NUMERIC;
    v_reconciled_amount NUMERIC;
    v_pending_amount NUMERIC;
BEGIN
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id <> '' AND p_bank_account_id <> 'all' THEN
        v_bank_uuid := p_bank_account_id::uuid;
    END IF;

    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND status != 'ignored' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END), 0),
        
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN reconciled = TRUE THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(reconciled, FALSE) = FALSE AND status != 'ignored' THEN total_amount ELSE 0 END), 0)
    INTO
        v_total_count,
        v_reconciled_count,
        v_pending_count,
        v_ignored_count,
        v_total_amount,
        v_reconciled_amount,
        v_pending_amount
    FROM financial_transactions t
    WHERE t.user_id = v_user_id
        AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
        AND t.transaction_date BETWEEN p_start_date AND p_end_date
        AND NOT COALESCE(t.is_void, false)
        -- Filtro de Busca (Descrição ou Categoria) - Mesma lógica da paginação
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
        'total_count', v_total_count,
        'reconciled_count', v_reconciled_count,
        'pending_count', v_pending_count,
        'ignored_count', v_ignored_count,
        'total_amount', v_total_amount,
        'reconciled_amount', v_reconciled_amount,
        'pending_amount', v_pending_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
