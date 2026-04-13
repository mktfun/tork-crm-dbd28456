# Prompt 19: Import Workflow & Bank Linking (Updated)

**Goal:**
Establish a flexible "Lazy Import" workflow where the user:
1.  **Imports** a file *without* specifying a bank.
2.  **Selects** a bank *only* when entering the Reconciliation Workbench.
3.  **Matches** transactions, which automatically *links* both the Statement Entry (if unassigned) and the System Transaction (if unassigned) to that selected bank.

**Instructions:**

1.  **Database Updates (SQL) - ALREADY EXECUTED**:
    *The following commands have been executed by the Agent. You may skip this step or verify if needed.*
    
    (Executed on Supabase Project: `jaouwhckqqnaxqyfvgyq`)

```sql
-- 1. UPDATE RPC: import_bank_statement_batch
-- Change: Allow p_bank_account_id to be NULL (Optional)
CREATE OR REPLACE FUNCTION public.import_bank_statement_batch(
    p_bank_account_id UUID DEFAULT NULL, -- Made Optional
    p_file_name TEXT,
    p_total_amount NUMERIC,
    p_entries JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_batch_id UUID;
    v_entry JSONB;
    v_inserted_count INT := 0;
    v_profile_name TEXT;
BEGIN
    SELECT nome_completo INTO v_profile_name FROM profiles WHERE id = v_user_id;

    -- Create History Record (Bank ID can be NULL)
    INSERT INTO bank_import_history (
        bank_account_id, file_name, total_amount, status, auditor_name, imported_by
    ) VALUES (
        p_bank_account_id, p_file_name, p_total_amount, 'completed', COALESCE(v_profile_name, 'Unknown'), v_user_id
    ) RETURNING id INTO v_batch_id;

    -- Insert Entries (Bank ID can be NULL)
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        INSERT INTO bank_statement_entries (
            user_id, bank_account_id, transaction_date, description, amount, reference_number, reconciliation_status, import_batch_id
        ) VALUES (
            v_user_id, 
            p_bank_account_id, -- Can be NULL
            (v_entry->>'transaction_date')::DATE, 
            v_entry->>'description', 
            (v_entry->>'amount')::NUMERIC, 
            v_entry->>'reference_number', 
            'pending', 
            v_batch_id
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id, 'count', v_inserted_count);
END;
$$;

-- 2. UPDATE RPC: reconcile_transaction_partial
-- Change: Accept p_target_bank_id to link BOTH sides to the selected bank
CREATE OR REPLACE FUNCTION public.reconcile_transaction_partial(
    p_statement_entry_id UUID,
    p_system_transaction_id UUID,
    p_amount_to_reconcile NUMERIC DEFAULT NULL,
    p_target_bank_id UUID DEFAULT NULL -- NEW: The bank selected in Workbench
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_bank_id UUID;
    v_sys_bank_id UUID;
    v_sys_paid NUMERIC;
    v_sys_amount NUMERIC;
    v_reconcile_amount NUMERIC;
    v_final_bank_id UUID;
    v_new_paid NUMERIC;
BEGIN
    -- Get Entry Info
    SELECT amount, bank_account_id INTO v_reconcile_amount, v_entry_bank_id 
    FROM bank_statement_entries WHERE id = p_statement_entry_id;
    
    -- Get System Info
    SELECT total_amount, COALESCE(paid_amount, 0), bank_account_id INTO v_sys_amount, v_sys_paid, v_sys_bank_id
    FROM financial_transactions WHERE id = p_system_transaction_id;

    IF v_reconcile_amount IS NULL OR v_sys_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction/Entry not found');
    END IF;

    -- Determine Final Bank ID Logic:
    -- Priority: 1. Target Bank (User Selected) -> 2. Entry's Existing Bank -> 3. System's Existing Bank
    v_final_bank_id := COALESCE(p_target_bank_id, v_entry_bank_id, v_sys_bank_id);

    -- Prep Amount
    v_reconcile_amount := COALESCE(p_amount_to_reconcile, ABS(v_reconcile_amount));

    -- Update Entry (Link to Bank if missing)
    UPDATE bank_statement_entries
    SET reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_by = v_user_id,
        matched_at = NOW(),
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id) -- LINK HERE
    WHERE id = p_statement_entry_id;

    -- Update System Transaction (Partial + Link)
    v_new_paid := v_sys_paid + v_reconcile_amount;
    
    UPDATE financial_transactions
    SET paid_amount = v_new_paid,
        bank_account_id = COALESCE(bank_account_id, v_final_bank_id), -- LINK HERE
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
$$;
```

2.  **Frontend Updates (ReconciliationPage)**:
    *   **Consolidated View**:
        *   **"Nova Importação" Button**: Opens upload modal.
        *   **NO Bank Select**: The modal should **NOT** require a bank selection initially. It imports as "Unassigned".
    *   **Workbench View**:
        *   **Bank Selector**: When entering Workbench (or inside it), the user **MUST** select a "Target Bank" (e.g., "Santander") to work on.
        *   **Left Column (Statement)**: 
            *   Fetch entries where `bank_account_id` is **NULL** OR `bank_account_id` == **Selected Bank**.
        *   **Right Column (System)**:
            *   Fetch entries where `bank_account_id` is **NULL** OR `bank_account_id` == **Selected Bank**.
        *   **Matching Action**:
            *   When clicking "Conciliar" (or standard match), make sure to pass the `selectedBankId` to the `reconcile_transaction_partial` RPC (as `p_target_bank_id`).
    *   **Badges**:
        *   Show "Sem Banco" badge on unassigned items in both lists to indicate they will be linked upon matching.

**User Story**:
1. User uploads `extrato.ofx` (no bank selected).
2. Goes to Workbench -> Selects "Banco Santander".
3. Left side shows the new OFX entries (unassigned).
4. Right side shows "Commission ABC" (unassigned).
5. User matches them.
6. **Magically**: Both the OFX entry and Commission ABC become linked to "Banco Santander".
