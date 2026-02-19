# Prompt 18: Commission Provisions & Logic Update

**Goal:** 
Refine the Commission logic to support "Provisioned" (Pending) commissions that:
1.  **Visibility**: Are visible in "Reconciliation" (to be matched) and "Treasury" (as receivable), but NOT in "Realized" dashboards until paid.
2.  **Unassigned Matching**: Can be matched against *any* bank account (since they are initially unassigned).
3.  **Zero Fix**: Fix the bug where generated commissions have 0 amount.
4.  **Due Date Logic**: When a **Partial Payment** occurs, automatically extend the `due_date` of the transaction by 30 days.

**Instructions:**

1.  **Database Updates (SQL) - ALREADY EXECUTED**:
    *The following commands have been executed by the Agent. You may skip this step or verify if needed.*
    
    (Executed on Supabase Project: `jaouwhckqqnaxqyfvgyq`)

```sql
-- 1. FIX: Update 0 amounts in financial_transactions from Ledger
-- Retrieves the positive amount (Asset/Expense) from ledger to fix the transaction header
UPDATE financial_transactions ft
SET total_amount = (
    SELECT ABS(fl.amount) 
    FROM financial_ledger fl 
    WHERE fl.transaction_id = ft.id 
    ORDER BY ABS(fl.amount) DESC 
    LIMIT 1
)
WHERE ft.total_amount = 0;

-- 2. UPDATE RPC: reconcile_transaction_partial
-- Added Logic: Update due_date to +30 days on partial match
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
        reconciled_at = CASE WHEN v_new_paid >= v_sys_amount THEN NOW() ELSE NULL END,
        -- NEW: Update Due Date by 30 days if Partial
        due_date = CASE 
            WHEN v_new_paid < v_sys_amount THEN (NOW() + INTERVAL '30 days')::DATE
            ELSE due_date -- Keep original if paid (or update? usually keep)
        END
    WHERE id = p_system_transaction_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. UPDATE RPC: get_transactions_for_reconciliation
-- Logic Change: Include transactions that are Pending AND have NO bank account assigned (Global Provision)
CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(p_bank_account_id UUID)
RETURNS TABLE (
    id UUID,
    transaction_date DATE,
    description TEXT,
    amount NUMERIC,
    type TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ft.id,
        ft.transaction_date,
        ft.description,
        -- Use Ledger amount if exists for this bank, else Total - Paid
        COALESCE(
            ABS((SELECT SUM(fl2.amount) FROM financial_ledger fl2 WHERE fl2.transaction_id = ft.id AND fl2.account_id = p_bank_account_id)),
            (ft.total_amount - COALESCE(ft.paid_amount, 0)) -- Show REMAINING amount
        ) as amount,
        fa.type::TEXT AS type,
        ft.status
    FROM financial_transactions ft
    JOIN financial_ledger fl ON ft.id = fl.transaction_id
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE
        (fa.type = 'expense' OR fa.type = 'revenue') -- Only result legs
        AND ft.is_void = false
        AND (
            -- Option A: Linked to this specific Bank Account (Ledger or Column)
            (EXISTS (SELECT 1 FROM financial_ledger fl2 WHERE fl2.transaction_id = ft.id AND fl2.account_id = p_bank_account_id))
            OR (ft.bank_account_id = p_bank_account_id)
            
            -- Option B: Unassigned Provision (Pending & No Bank Account)
            OR (ft.bank_account_id IS NULL AND ft.status IN ('pending', 'partial'))
        )
        AND (ft.reconciled = false OR ft.reconciled IS NULL)
        -- Don't show fully paid ones (redundant with reconciled check but safer)
        AND (ft.total_amount > COALESCE(ft.paid_amount, 0))
    ORDER BY ft.transaction_date DESC;
END;
$$ LANGUAGE plpgsql;
```

2.  **Frontend Updates**:
    *   **ReconciliationPage.tsx**:
        *   Ensure the "Sistema" list displays these "Pending" transactions.
        *   They might appear with `type` = 'revenue' (Receita).
    *   **Dashboard / Treasury**:
        *   If the user mentioned "Tesouraria", ensure the **Treasury** page fetches 'pending' transactions to show as "Provisioned" (Future Inflows).
        *   (Optional) Validated that Main Dashboard usually filters by `status='paid'` or `reconciled=true`. If not, add that filter to exclude Provisions from "Realized".

**Reasoning:**
*   **Zero Fix**: The SQL update corrects the bad data from the import.
*   **Partial Logic**: The user specifically requested extending the due date by 30 days to handle "rolling" payments.
*   **Visibility**: Relaxing the `get_transactions_for_reconciliation` filter allows "Unbanked" commissions (Provisions) to be seen and matched against *any* bank Statement, which is the correct flow for reconciling provisions.
