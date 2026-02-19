# Prompt 23: Fix Reconciliation Duplicate Key Error

**Problem:**
When reconciling an item that was imported "Without Bank" (Lazy Import), the system attempts to assign it to the selected Bank. If that Bank *already* contains this transaction (imported previously), the operation fails with:
`duplicate key value violates unique constraint "bank_statement_entries_bank_account_id_transaction_date_ref_key"`

**Goal:**
Update the `reconcile_transaction_partial` RPC to intelligently handle duplicates:
1.  **Check**: Before assigning the Bank ID, check if a collision would occur.
2.  **Merge**: If a duplicate exists in the target bank, **delete the "Lazy" entry** and use the **Existing Entry** for the reconciliation.
3.  **Proceed**: Continue the reconciliation using the surviving entry ID.

**Instructions:**

1.  **Database Updates (SQL)**:
    Replace the `reconcile_transaction_partial` function with this robust version.

```sql
CREATE OR REPLACE FUNCTION public.reconcile_transaction_partial(
    p_statement_entry_id UUID,
    p_system_transaction_id UUID,
    p_amount_to_reconcile NUMERIC DEFAULT NULL,
    p_target_bank_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    v_existing_id UUID; -- ID of the duplicate found in target bank
    v_proc_entry_id UUID := p_statement_entry_id; -- Working ID (starts with input)
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
        -- Find if this exact transaction already exists in the target bank
        SELECT id INTO v_existing_id
        FROM bank_statement_entries
        WHERE bank_account_id = v_final_bank_id
          AND transaction_date = v_entry_date
          AND COALESCE(reference_number, '') = COALESCE(v_entry_ref, '') -- Handle NULL refs safe
          AND amount = v_reconcile_amount -- Ensure amount matches to be redundant
          AND id != p_statement_entry_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            -- DUPLICATE FOUND!
            -- Logic: The user selected a "Lazy" entry that is actually a duplicate of one already in the bank.
            -- We should reconcile the EXISTING one and remove the Lazy one.
            
            -- Delete the lazy/ghost entry
            DELETE FROM bank_statement_entries WHERE id = p_statement_entry_id;
            
            -- Swap our working ID to the existing persistent entry
            v_proc_entry_id := v_existing_id;
        END IF;
    END IF;

    -- 5. Prepare Amount
    v_reconcile_amount := COALESCE(p_amount_to_reconcile, ABS(v_reconcile_amount));

    -- 6. Update Entry (Using v_proc_entry_id)
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
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id),
        is_reconciled = (v_new_paid >= v_sys_amount), -- removed trivial epsilon check for now
        status = CASE WHEN v_new_paid >= v_sys_amount THEN 'paid' ELSE 'partial' END,
        reconciled_at = CASE WHEN v_new_paid >= v_sys_amount THEN NOW() ELSE NULL END,
        due_date = CASE
            WHEN v_new_paid < v_sys_amount THEN (NOW() + INTERVAL '30 days')::DATE
            ELSE due_date
        END
    WHERE id = p_system_transaction_id;

    RETURN jsonb_build_object('success', true, 'merged', v_existing_id IS NOT NULL);
END;
$$;
```

**What this fixes:**
It robustly handles the case where you imported a file "Without Bank" but those transactions already existed in the "Santander" bank. Instead of crashing, it now smartly merges them!

