CREATE OR REPLACE FUNCTION public.reconcile_insurance_aggregate_fifo(
    p_statement_entry_id UUID,
    p_insurance_company_id UUID,
    p_target_bank_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
          AND (bank_account_id IS NULL OR bank_account_id = v_final_bank_id)
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

        UPDATE public.financial_transactions
        SET paid_amount = v_new_paid,
            transaction_date = v_entry_date,
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

    IF v_reconciled_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nenhum recebível pendente encontrado para esta seguradora.');
    END IF;

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
$$;