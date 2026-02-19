# Prompt 24: Clean Workbench System View (Hide Unassigned by Default)

**Problem:**
The Workbench "System" column (Right side) is polluted with ALL unassigned commissions (Provisioned) when a specific bank is selected. The user wants to see **ONLY** transactions already linked to the selected bank by default, to avoid confusion.

**Goal:**
1.  **Filter Default**: When a Bank is selected, hide "Sem Banco" items from the System list.
2.  **Toggle Option**: Add a "Show Unassigned" (Mostrar Não Vinculados) toggle in the Workbench header to allow seeing them if needed.

**Instructions:**

1.  **Database Updates (SQL)**:
    > **[ALREADY EXECUTED]** This SQL has been run. No need to execute again.
    
```sql
-- ALREADY RUN ON SUPABASE
-- UPDATE RPC: get_transactions_for_reconciliation
-- Change: Add p_include_unassigned flag (Default FALSE)
/*
CREATE OR REPLACE FUNCTION get_transactions_for_reconciliation(
    p_bank_account_id UUID,
    p_include_unassigned BOOLEAN DEFAULT FALSE -- NEW FLAG
)
RETURNS TABLE (
...
) AS $$
BEGIN
    RETURN QUERY
    SELECT
...
    ORDER BY ft.transaction_date DESC;
END;
$$ LANGUAGE plpgsql;
*/
```
```

2.  **Frontend Updates (`useReconciliation.ts` & `ReconciliationWorkbench.tsx`)**:
    *   **Hook Update**: Update `usePendingReconciliation` to accept `includeUnassigned` param and pass it to the RPC.
    *   **UI Update**:
        *   In the **System Column Header** (Right side), add a **Toggle/Checkbox**:
        *   Label: "Mostrar Sem Banco" (Default: OFF).
        *   When ticked: Refetch with `includeUnassigned = true`.

**User Story:**
1.  User enters Workbench -> Selects "Santander".
2.  Right column is **Clean** (shows only Santander items).
3.  User wants to match a new Commission.
4.  User toggles "Mostrar Sem Banco".
5.  Right column populates with unassigned commissions.
6.  User drags & matches -> Commission becomes linked -> Toggle can be turned off.
