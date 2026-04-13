-- 1. Sync existing data: set reconciled=true where is_reconciled=true but reconciled is false/null
UPDATE financial_transactions 
SET reconciled = true 
WHERE is_reconciled = true 
  AND COALESCE(reconciled, false) = false;

-- 2. Fix reconcile_transactions: add reconciled = TRUE
CREATE OR REPLACE FUNCTION public.reconcile_transactions(p_statement_entry_id uuid, p_system_transaction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_date DATE;
BEGIN
    SELECT transaction_date INTO v_entry_date
    FROM bank_statement_entries 
    WHERE id = p_statement_entry_id AND user_id = v_user_id;

    IF v_entry_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entrada do extrato não encontrada');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM financial_transactions 
        WHERE id = p_system_transaction_id AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transação do sistema não encontrada');
    END IF;
    
    UPDATE bank_statement_entries
    SET 
        reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_at = NOW(),
        matched_by = v_user_id,
        match_confidence = 1.0,
        updated_at = NOW()
    WHERE id = p_statement_entry_id;
    
    UPDATE financial_transactions
    SET 
        is_reconciled = TRUE,
        reconciled = TRUE,
        transaction_date = v_entry_date,
        reconciled_at = NOW(),
        reconciled_statement_id = p_statement_entry_id
    WHERE id = p_system_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Transações conciliadas com sucesso'
    );
END;
$function$;

-- 3. Fix reconcile_transaction_partial (3 args)
CREATE OR REPLACE FUNCTION public.reconcile_transaction_partial(p_statement_entry_id uuid, p_system_transaction_id uuid, p_amount_to_reconcile numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_amount NUMERIC;
    v_entry_date DATE;
    v_bank_account_id UUID;
    v_sys_amount NUMERIC;
    v_sys_paid NUMERIC;
    v_sys_bank_id UUID;
    v_new_paid NUMERIC;
    v_reconcile_amount NUMERIC;
BEGIN
    SELECT amount, bank_account_id, transaction_date INTO v_entry_amount, v_bank_account_id, v_entry_date
    FROM bank_statement_entries WHERE id = p_statement_entry_id;
    
    SELECT total_amount, COALESCE(paid_amount, 0), bank_account_id INTO v_sys_amount, v_sys_paid, v_sys_bank_id
    FROM financial_transactions WHERE id = p_system_transaction_id;

    IF v_entry_amount IS NULL OR v_sys_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;

    v_reconcile_amount := COALESCE(p_amount_to_reconcile, ABS(v_entry_amount));

    UPDATE bank_statement_entries
    SET reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_by = v_user_id,
        matched_at = NOW()
    WHERE id = p_statement_entry_id;

    v_new_paid := v_sys_paid + v_reconcile_amount;
    
    UPDATE financial_transactions
    SET paid_amount = v_new_paid,
        transaction_date = v_entry_date,
        bank_account_id = COALESCE(bank_account_id, v_bank_account_id),
        is_reconciled = (v_new_paid >= v_sys_amount),
        reconciled = (v_new_paid >= v_sys_amount),
        status = CASE WHEN v_new_paid >= v_sys_amount THEN 'paid' ELSE 'partial' END,
        reconciled_at = CASE WHEN v_new_paid >= v_sys_amount THEN NOW() ELSE NULL END,
        due_date = CASE 
            WHEN v_new_paid < v_sys_amount THEN (NOW() + INTERVAL '30 days')::DATE
            ELSE due_date 
        END
    WHERE id = p_system_transaction_id;

    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 4. Fix reconcile_transaction_partial (4 args)
CREATE OR REPLACE FUNCTION public.reconcile_transaction_partial(p_statement_entry_id uuid, p_system_transaction_id uuid, p_amount_to_reconcile numeric DEFAULT NULL::numeric, p_target_bank_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_bank_id UUID;
    v_entry_date DATE;
    v_entry_ref TEXT;
    v_entry_amount NUMERIC;
    v_sys_bank_id UUID;
    v_sys_paid NUMERIC;
    v_sys_amount NUMERIC;
    v_reconcile_amount NUMERIC;
    v_final_bank_id UUID;
    v_new_paid NUMERIC;
    v_existing_id UUID;
    v_proc_entry_id UUID := p_statement_entry_id;
BEGIN
    SELECT amount, bank_account_id, transaction_date, reference_number
    INTO v_reconcile_amount, v_entry_bank_id, v_entry_date, v_entry_ref
    FROM bank_statement_entries WHERE id = p_statement_entry_id;

    SELECT total_amount, COALESCE(paid_amount, 0), bank_account_id 
    INTO v_sys_amount, v_sys_paid, v_sys_bank_id
    FROM financial_transactions WHERE id = p_system_transaction_id;

    IF v_reconcile_amount IS NULL OR v_sys_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction/Entry not found');
    END IF;

    v_final_bank_id := COALESCE(p_target_bank_id, v_entry_bank_id, v_sys_bank_id);

    IF v_entry_bank_id IS NULL AND v_final_bank_id IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM bank_statement_entries
        WHERE bank_account_id = v_final_bank_id
          AND transaction_date = v_entry_date
          AND COALESCE(reference_number, '') = COALESCE(v_entry_ref, '') 
          AND amount = v_reconcile_amount
          AND id != p_statement_entry_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            DELETE FROM bank_statement_entries WHERE id = p_statement_entry_id;
            v_proc_entry_id := v_existing_id;
        END IF;
    END IF;

    v_reconcile_amount := COALESCE(p_amount_to_reconcile, ABS(v_reconcile_amount));

    UPDATE bank_statement_entries
    SET reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_by = v_user_id,
        matched_at = NOW(),
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id)
    WHERE id = v_proc_entry_id;

    v_new_paid := v_sys_paid + v_reconcile_amount;

    UPDATE financial_transactions
    SET paid_amount = v_new_paid,
        transaction_date = v_entry_date,
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id),
        is_reconciled = (v_new_paid >= v_sys_amount),
        reconciled = (v_new_paid >= v_sys_amount),
        status = CASE WHEN v_new_paid >= v_sys_amount THEN 'paid' ELSE 'partial' END,
        reconciled_at = CASE WHEN v_new_paid >= v_sys_amount THEN NOW() ELSE NULL END,
        due_date = CASE
            WHEN v_new_paid < v_sys_amount THEN (NOW() + INTERVAL '30 days')::DATE
            ELSE due_date
        END
    WHERE id = p_system_transaction_id;

    RETURN jsonb_build_object('success', true, 'merged', v_existing_id IS NOT NULL);
END;
$function$;