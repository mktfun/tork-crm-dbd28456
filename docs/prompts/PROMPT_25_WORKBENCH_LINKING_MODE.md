# Prompt 25: Fix Workbench - Logic of "Linking Modal" (REFACTOR)

**CRITICAL FIX:**
The current implementation is **BROKEN**.
1.  Entering Workbench -> Asks for Bank -> **FILTERS EVERYTHING OUT** (User sees empty screen).
2.  User wants to see **ALL UNASSIGNED ITEMS** (Consolidated) by default.
3.  The "Select Bank" Modal should **ONLY** appear when the user **performs an action** that requires it (e.g., Dragging a "No Bank" item to another "No Bank" item).

**Goal:**
Restore the "Consolidated View" as the default state and move the "Bank Selection" logic to the **Drop Action**.

**Instructions:**

1.  **Frontend Updates (`ReconciliationPage.tsx` / `ReconciliationWorkbench.tsx`)**:
    
    *   **REMOVE** the logic that opens `setShowBankSelectForWorkbench(true)` automatically when entering the tab.
    *   **DEFAULT STATE**: `selectedBankAccountId` = `null` (Consolidated View).
    *   **VIEW**: Show Left Column (Statement) and Right Column (System) with **ALL** items that have `bank_account_id IS NULL`.

2.  **Interaction Design (The Fix)**:
    
    *   **Scenario A: Matching "No Bank" Commission -> "Santander" Statement Line**
        *   User drags Commission (Right) to Statement Line (Left).
        *   **Action**: Link Commission to Santander. Update Commission `bank_account_id` = Santander.
        *   **Result**: Success. No Modal needed.

    *   **Scenario B: Matching "No Bank" Commission -> "No Bank" Statement Line**
        *   User drags Commission (Right) to Statement Line (Left).
        *   **System Detects**: Both sides have `bank_account_id === null`.
        *   **ACTION REQUIRED**: **OPEN MODAL NOW**.
        *   **Modal Text**: "Para qual banco você deseja vincular esta conciliação?"
        *   **User Selects**: "Itaú".
        *   **Execute**: Call `reconcile_transaction_partial` with `p_target_bank_id = 'Itau_ID'`.
        *   **Result**: Both items updated to Itaú and Reconciled.

3.  **Visual Cleanup**:
    *   Ensure the "System" column (Right) **ALWAYS** shows `bank_account_id IS NULL` items when in Consolidated View.
    *   Do not apply the "Clean Workbench" filter (Prompt 24) when we are in "Consolidated Mode". That filter is only for when a **specific bank** is explicitly selected from the dropdown filter.

**User Story (Corrected):**
1.  User clicks "Workbench".
2.  **No Modal appears.**
3.  User sees list of "Imported Statements (No Bank)" on left, "Commissions (No Bank)" on right.
4.  User drags a Commission to a Statement.
5.  **IF** the Statement has no bank, **THEN** show Modal: "Qual banco?".
6.  User picks "Nubank".
7.  System saves everything to Nubank.
