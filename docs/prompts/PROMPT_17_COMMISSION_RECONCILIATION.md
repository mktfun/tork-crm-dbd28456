# Prompt 17: COMPLETE - Commission Reconciliation & Import Sync

**Goal:**
Establish a robust Commission Reconciliation System that supports:
1.  **Partial Payments**: Identifying and recording partial commission payments.
2.  **Import History**: Tracking which file generated which transactions (Batches).
3.  **No Auto-Reconciliation**: Ensuring imports stay "Pending" for manual review.
4.  **UI Updates**: Show "Partial" badges and "Import Batch" details.
5.  **Strict Design Adherence**: Ensure all new UI cards follow the `AppCard` glassmorphism rules.

**Instructions:**

1.  **Database Updates (SQL) - ALREADY EXECUTED**:
    *The following commands have been executed by the Agent. You may skip this step or verify if needed.*
    
    (Executed on Supabase Project: `jaouwhckqqnaxqyfvgyq`)

```sql
-- 1. Add 'paid_amount' to track partial payments
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- 2. Create Import History Table (if not exists)
CREATE TABLE IF NOT EXISTS bank_import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES bank_accounts(id),
    file_name TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'completed',
    auditor_name TEXT,
    imported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update 'bank_statement_entries' to link to history
ALTER TABLE bank_statement_entries ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES bank_import_history(id);

-- 4. RPC: Import Batch (Creates History + Entries)
CREATE OR REPLACE FUNCTION public.import_bank_statement_batch(
    p_bank_account_id UUID,
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
    -- Get Auditor Name
    SELECT nome_completo INTO v_profile_name FROM profiles WHERE id = v_user_id;

    -- Create History Record
    INSERT INTO bank_import_history (
        bank_account_id, file_name, total_amount, status, auditor_name, imported_by
    ) VALUES (
        p_bank_account_id, p_file_name, p_total_amount, 'completed', COALESCE(v_profile_name, 'Unknown'), v_user_id
    ) RETURNING id INTO v_batch_id;

    -- Insert Entries
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        INSERT INTO bank_statement_entries (
            user_id, bank_account_id, transaction_date, description, amount, reference_number, reconciliation_status, import_batch_id
        ) VALUES (
            v_user_id, 
            p_bank_account_id, 
            (v_entry->>'transaction_date')::DATE, 
            v_entry->>'description', 
            (v_entry->>'amount')::NUMERIC, 
            v_entry->>'reference_number', 
            'pending', -- FORCE PENDING
            v_batch_id
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id, 'count', v_inserted_count);
END;
$$;

-- 5. RPC: Partial Reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_transaction_partial(
    p_statement_entry_id UUID,
    p_system_transaction_id UUID,
    p_amount_to_reconcile NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry_amount NUMERIC;
    v_sys_amount NUMERIC;
    v_sys_paid NUMERIC;
    v_new_paid NUMERIC;
    v_reconcile_amount NUMERIC;
BEGIN
    SELECT amount INTO v_entry_amount FROM bank_statement_entries WHERE id = p_statement_entry_id;
    SELECT total_amount, COALESCE(paid_amount, 0) INTO v_sys_amount, v_sys_paid 
    FROM financial_transactions WHERE id = p_system_transaction_id;

    IF v_entry_amount IS NULL OR v_sys_amount IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;

    v_reconcile_amount := COALESCE(p_amount_to_reconcile, ABS(v_entry_amount));

    -- Update Entry Status
    UPDATE bank_statement_entries
    SET reconciliation_status = 'manual_match',
        matched_transaction_id = p_system_transaction_id,
        matched_by = v_user_id,
        matched_at = NOW()
    WHERE id = p_statement_entry_id;

    -- Update System Transaction (Partial Logic)
    v_new_paid := v_sys_paid + v_reconcile_amount;
    
    UPDATE financial_transactions
    SET paid_amount = v_new_paid,
        is_reconciled = (v_new_paid >= v_sys_amount), 
        status = CASE WHEN v_new_paid >= v_sys_amount THEN 'paid' ELSE 'partial' END,
        reconciled_at = CASE WHEN v_new_paid >= v_sys_amount THEN NOW() ELSE NULL END
    WHERE id = p_system_transaction_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
```

2.  **Frontend: `useReconciliation.ts`**:
    *   Update `useImportStatementEntries` to accept `fileName` and call `import_bank_statement_batch`.
    *   Add `useReconcilePartial` hook calling `reconcile_transaction_partial`.
    *   Update `useApplyMatchSuggestions` to detect amount differences and call `reconcile_transaction_partial` if needed.

3.  **Frontend: `StatementImporter.tsx`**:
    *   Pass the uploaded file's name (`file.name`) to the mutation.
    *   Ensure the user knows this file name will be saved.

4.  **Frontend: `MatchSuggestions.tsx`**:
    *   **Visual Indicator**: If `system_amount != statement_amount`, display a "Parcial" badge (Amber color).
    *   **Logic**: Use `useReconcilePartial` when clicking "Aplicar" on these specific items.
    *   **Lint Fix**: Ensure date display uses `suggestion.date_diff` or `suggestion.statement_date` (parse correctly if string).

5.  **Frontend: `ReconciliationPage.tsx`**:
    *   Add "Ver Sugestões" button if `suggestions.length > 0`.
    *   Ensure `TransactionKpiCard` strictly follows the `AppCard` design rules (glassmorphism classes).
    *   **The Rule**: Do not use custom KPI cards. Use the standard `AppCard` container with `glass-component`, `shadow-lg`, `hover:scale-105`, `cursor-pointer`, `bg-card`, `hover:bg-secondary/70`.

6.  **Frontend: `TransactionKpiCard.tsx` (Strict Rule)**:
    *   Rewrite the component to use the mandatory classes above.
    *   Do not apply colored backgrounds to the entire card, only to the icon/text elements internally.
