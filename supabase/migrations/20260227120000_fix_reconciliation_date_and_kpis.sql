-- Migration to fix Reconciliation Dates and KPI calculation

-- 1. Fix get_reconciliation_kpis to count the Bank Statement Entries instead of System Transactions
-- This makes the KPIs correctly reflect the imported OFX status (Pending vs Reconciled)
CREATE OR REPLACE FUNCTION public.get_reconciliation_kpis(p_bank_account_id text, p_start_date date, p_end_date date, p_search_term text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        COALESCE(SUM(CASE WHEN reconciliation_status = 'pending' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN reconciliation_status IN ('matched', 'manual_match') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN reconciliation_status = 'ignored' THEN 1 ELSE 0 END), 0),
        -- Reconciled Breakdown
        COALESCE(SUM(CASE WHEN reconciliation_status IN ('matched', 'manual_match') AND amount > 0 THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN reconciliation_status IN ('matched', 'manual_match') AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
        -- Pending Breakdown
        COALESCE(SUM(CASE WHEN reconciliation_status = 'pending' AND amount > 0 THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN reconciliation_status = 'pending' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
    INTO
        v_cur_total_count,
        v_cur_pending_count,
        v_cur_reconciled_count,
        v_cur_ignored_count,
        v_cur_reconciled_revenue,
        v_cur_reconciled_expense,
        v_cur_pending_revenue,
        v_cur_pending_expense
    FROM bank_statement_entries t
    WHERE t.user_id = v_user_id
      AND (v_bank_uuid IS NULL OR t.bank_account_id = v_bank_uuid)
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
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
$function$;

-- 2. Update reconcile_insurance_aggregate_fifo (Signature 1: 2 args)
CREATE OR REPLACE FUNCTION public.reconcile_insurance_aggregate_fifo(p_statement_entry_id uuid, p_insurance_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_amount NUMERIC;
    v_entry_date DATE;
    v_bank_account_id UUID;
    v_remaining_amount NUMERIC;
    v_tx RECORD;
    v_tx_balance NUMERIC;
    v_payment_amount NUMERIC;
    v_new_paid NUMERIC;
    v_full_reconcile BOOLEAN;
    v_reconciled_count INTEGER := 0;
BEGIN
    -- 1. Obter detalhes do Extrato
    SELECT amount, bank_account_id, transaction_date
    INTO v_entry_amount, v_bank_account_id, v_entry_date
    FROM public.bank_statement_entries
    WHERE id = p_statement_entry_id AND user_id = v_user_id;

    IF v_entry_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Statement entry not found or unauthorized.');
    END IF;

    v_remaining_amount := ABS(v_entry_amount);

    -- 2. Loop pelas transações pendentes
    FOR v_tx IN (
        SELECT id, total_amount, COALESCE(paid_amount, 0) as paid_amount
        FROM public.financial_transactions
        WHERE user_id = v_user_id
          AND insurance_company_id = p_insurance_company_id
          AND type = 'revenue'
          AND is_void = false
          AND is_reconciled = false
          AND bank_account_id IS NULL
        ORDER BY COALESCE(due_date, transaction_date) ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
    ) LOOP
        IF v_remaining_amount <= 0 THEN
            EXIT;
        END IF;

        v_tx_balance := v_tx.total_amount - v_tx.paid_amount;
        
        IF v_tx_balance <= 0 THEN
            CONTINUE;
        END IF;

        v_payment_amount := LEAST(v_remaining_amount, v_tx_balance);
        v_remaining_amount := v_remaining_amount - v_payment_amount;
        v_new_paid := v_tx.paid_amount + v_payment_amount;
        v_full_reconcile := (v_new_paid >= v_tx.total_amount);

        -- 3. Atualizar a transação E a transaction_date
        UPDATE public.financial_transactions
        SET paid_amount = v_new_paid,
            transaction_date = v_entry_date, -- THE FIX: Set transaction_date to the bank statement date
            bank_account_id = CASE WHEN v_full_reconcile THEN v_bank_account_id ELSE NULL END,
            is_reconciled = v_full_reconcile,
            reconciled = v_full_reconcile,
            is_confirmed = true,
            status = CASE WHEN v_full_reconcile THEN 'paid' ELSE 'partial' END,
            reconciled_at = CASE WHEN v_full_reconcile THEN NOW() ELSE NULL END,
            reconciled_statement_id = CASE WHEN v_full_reconcile THEN p_statement_entry_id ELSE NULL END,
            reconciliation_method = 'automatic_fifo',
            due_date = CASE 
                WHEN NOT v_full_reconcile THEN (NOW() + INTERVAL '30 days')::DATE
                ELSE due_date 
            END
        WHERE id = v_tx.id;

        v_reconciled_count := v_reconciled_count + 1;
    END LOOP;

    -- 5. Atualizar a linha do Extrato
    UPDATE public.bank_statement_entries
    SET reconciliation_status = 'matched',
        matched_by = v_user_id,
        matched_at = NOW(),
        notes = 'Conciliação Automática Agrupada por Seguradora (FIFO). Apólices processadas: ' || v_reconciled_count
    WHERE id = p_statement_entry_id;

    RETURN jsonb_build_object(
        'success', true, 
        'reconciled_count', v_reconciled_count,
        'remaining_unmatched_amount', v_remaining_amount
    );
END;
$function$;

-- 3. Update reconcile_insurance_aggregate_fifo (Signature 2: 3 args)
CREATE OR REPLACE FUNCTION public.reconcile_insurance_aggregate_fifo(p_statement_entry_id uuid, p_insurance_company_id uuid, p_target_bank_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_amount NUMERIC;
    v_entry_bank_id UUID;
    v_entry_date DATE;
    v_final_bank_id UUID;
    v_remaining_amount NUMERIC;
    v_tx RECORD;
    v_tx_balance NUMERIC;
    v_payment_amount NUMERIC;
    v_new_paid NUMERIC;
    v_full_reconcile BOOLEAN;
    v_reconciled_count INTEGER := 0;
BEGIN
    -- 1. Obter detalhes do Extrato
    SELECT amount, bank_account_id, transaction_date
    INTO v_entry_amount, v_entry_bank_id, v_entry_date
    FROM public.bank_statement_entries
    WHERE id = p_statement_entry_id AND user_id = v_user_id;

    IF v_entry_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Statement entry not found or unauthorized.');
    END IF;

    v_final_bank_id := COALESCE(p_target_bank_id, v_entry_bank_id);
    v_remaining_amount := ABS(v_entry_amount);

    FOR v_tx IN (
        SELECT id, total_amount, COALESCE(paid_amount, 0) as paid_amount, bank_account_id
        FROM public.financial_transactions
        WHERE user_id = v_user_id
          AND insurance_company_id = p_insurance_company_id
          AND type = 'revenue'
          AND is_void = false
          AND is_reconciled = false
          AND bank_account_id IS NULL
        ORDER BY COALESCE(due_date, transaction_date) ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
    ) LOOP
        IF v_remaining_amount <= 0 THEN
            EXIT;
        END IF;

        v_tx_balance := v_tx.total_amount - v_tx.paid_amount;
        
        IF v_tx_balance <= 0 THEN
            CONTINUE;
        END IF;

        v_payment_amount := LEAST(v_remaining_amount, v_tx_balance);
        v_remaining_amount := v_remaining_amount - v_payment_amount;
        v_new_paid := v_tx.paid_amount + v_payment_amount;
        v_full_reconcile := (v_new_paid >= v_tx.total_amount);

        -- 3. Atualizar a transação
        UPDATE public.financial_transactions
        SET paid_amount = v_new_paid,
            transaction_date = v_entry_date, -- THE FIX
            bank_account_id = COALESCE(v_tx.bank_account_id, v_final_bank_id),
            is_reconciled = v_full_reconcile,
            reconciled = v_full_reconcile,
            is_confirmed = true,
            status = CASE WHEN v_full_reconcile THEN 'paid' ELSE 'partial' END,
            reconciled_at = CASE WHEN v_full_reconcile THEN NOW() ELSE NULL END,
            reconciled_statement_id = CASE WHEN v_full_reconcile THEN p_statement_entry_id ELSE NULL END,
            reconciliation_method = 'automatic_fifo',
            due_date = CASE 
                WHEN NOT v_full_reconcile THEN (NOW() + INTERVAL '30 days')::DATE
                ELSE due_date 
            END
        WHERE id = v_tx.id;

        v_reconciled_count := v_reconciled_count + 1;
    END LOOP;

    -- 5. Atualizar a linha do Extrato
    UPDATE public.bank_statement_entries
    SET reconciliation_status = 'matched',
        matched_by = v_user_id,
        matched_at = NOW(),
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id),
        notes = 'Conciliação Automática Agrupada por Seguradora (FIFO). Apólices processadas: ' || v_reconciled_count
    WHERE id = p_statement_entry_id;

    RETURN jsonb_build_object(
        'success', true, 
        'reconciled_count', v_reconciled_count,
        'remaining_unmatched_amount', v_remaining_amount
    );
END;
$function$;

-- 4. Update reconcile_transactions
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
    -- Verificar se pertence ao user
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
    
    -- Atualizar entrada do extrato
    UPDATE bank_statement_entries
    SET 
        reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_at = NOW(),
        matched_by = v_user_id,
        match_confidence = 1.0,
        updated_at = NOW()
    WHERE id = p_statement_entry_id;
    
    -- Atualizar transação do sistema
    UPDATE financial_transactions
    SET 
        is_reconciled = TRUE,
        transaction_date = v_entry_date, -- THE FIX
        reconciled_at = NOW(),
        reconciled_statement_id = p_statement_entry_id
    WHERE id = p_system_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Transações conciliadas com sucesso'
    );
END;
$function$;

-- 5. Update reconcile_transaction_partial (Signature 2: 4 args)
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
    -- 1. Get Entry Info
    SELECT amount, bank_account_id, transaction_date, reference_number
    INTO v_reconcile_amount, v_entry_bank_id, v_entry_date, v_entry_ref
    FROM bank_statement_entries WHERE id = p_statement_entry_id;

    -- 2. Get System Info
    SELECT total_amount, COALESCE(paid_amount, 0), bank_account_id 
    INTO v_sys_amount, v_sys_paid, v_sys_bank_id
    FROM financial_transactions WHERE id = p_system_transaction_id;

    IF v_reconcile_amount IS NULL OR v_sys_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction/Entry not found');
    END IF;

    -- 3. Determine Final Bank ID
    v_final_bank_id := COALESCE(p_target_bank_id, v_entry_bank_id, v_sys_bank_id);

    -- 4. SMART MERGE: Check for Duplicates if we are assigning a new Bank ID
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

    -- 5. Prepare Amount
    v_reconcile_amount := COALESCE(p_amount_to_reconcile, ABS(v_reconcile_amount));

    -- 6. Update Entry
    UPDATE bank_statement_entries
    SET reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_by = v_user_id,
        matched_at = NOW(),
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id)
    WHERE id = v_proc_entry_id;

    -- 7. Update System Transaction
    v_new_paid := v_sys_paid + v_reconcile_amount;

    UPDATE financial_transactions
    SET paid_amount = v_new_paid,
        transaction_date = v_entry_date, -- THE FIX
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id),
        is_reconciled = (v_new_paid >= v_sys_amount),
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

-- Note: reconcile_transaction_partial (Signature 1: 3 args) is rarely used or delegates to the 4 arg version.
-- Just strictly updating the date on that one too for completion.
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
        transaction_date = v_entry_date, -- THE FIX
        bank_account_id = COALESCE(bank_account_id, v_bank_account_id),
        is_reconciled = (v_new_paid >= v_sys_amount), 
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
